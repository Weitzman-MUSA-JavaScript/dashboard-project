library(pacman)
p_load(tidyverse, sf, janitor)

raw <- st_read("on_street_parking.geojson")

hoods <- st_read("hoods/Neighborhoods.shp")
hoods <- st_transform(hoods, crs = st_crs(raw))

filtered_hoods <- hoods %>%
  st_filter(raw, .predicate = st_intersects)

st_write(filtered_hoods, "hoods.geojson", append=TRUE)

colnames(on_street)


on_street <- raw %>%
  select(OBJ_CODE, TIMELIMIT, PKGTYPE, AORP, PKGENDAY:NOPARKTIME, geometry)

unique(on_street$TIMELIMIT)

on_street <- on_street %>%
  filter(TIMELIMIT != "No Parking Anytime")

on_street <- on_street %>%
  clean_names("snake")%>%
  mutate(timelimit = case_when(timelimit == "2 Hour" ~ 120,
                               timelimit == "5 Minutes" ~ 5,
                               timelimit == "15 Minutes" ~ 15,
                               timelimit == "30 Minutes" ~ 30,
                               timelimit == "3+" ~ 180,
                               timelimit == "10 Hour" ~ 600,
                               timelimit == "2+" ~ 120,
                               timelimit == "1 Hour" ~ 60,
                               timelimit == "1+" ~ 60,
                               timelimit == "4 Hour" ~ 240,
                               timelimit == "90 Minutes" ~ 90,
                               timelimit == "4+" ~ 240,
                               timelimit == "3 Hour" ~ 180,
                               timelimit == "6 Hour" ~ 360,
                               timelimit == "8 Hour" ~ 480,
                               timelimit == "No Limit" ~ 1440))


unique(on_street$timelimit)

on_street <- on_street %>%
  filter(!is.na(pkgenday))

no_park <- on_street %>%
  group_by(noparkdays)%>%
  tally()

park_days<- on_street %>%
  mutate(noparkdays = case_when(!is.na(noparkdays) ~ noparkdays,
                                !is.na(pkgsday) ~ pkgsday,
                                TRUE ~ noparkdays))

park_days <- park_days %>%
  mutate(noparktime = case_when(
    !is.na(noparktime) ~ noparktime,
    !is.na(pkgswbeg) ~ paste(pkgswbeg, "-", pkgswend),
    TRUE ~ noparktime
  ))

park_days <- park_days %>%
  select(-pkgsday, -pkgswbeg, -pkgswend, -parkmob, -tmstrcn, -aorp)

standardize_time <- function(time_str) {
  # Return NA for NA inputs
  if (all(is.na(time_str))) return(time_str)
  
  # Vectorized operations
  time_str <- ifelse(is.na(time_str), NA, 
                     sapply(time_str, function(x) {
                       if (is.na(x)) return(NA)
                       
                       # Replace "Midnight" with "12:00 am"
                       x <- str_replace(x, "Midnight", "12:00 am")
                       
                       # Standardize format: remove extra spaces, convert to lowercase
                       x <- str_trim(tolower(x))
                       
                       # Handle multiple time ranges
                       x <- str_replace_all(x, " and | & ", "|")
                       
                       # Remove any spaces around hyphens
                       x <- str_replace_all(x, "\\s*-\\s*", "-")
                       
                       return(x)
                     })
  )
  return(time_str)
}

# Vectorized function to standardize days format
standardize_days <- function(days_str) {
  # Return NA for NA inputs
  if (all(is.na(days_str))) return(days_str)
  
  # Vectorized operations
  days_str <- ifelse(is.na(days_str), NA,
                     sapply(days_str, function(x) {
                       if (is.na(x)) return(NA)
                       
                       # Convert to title case for consistency
                       x <- str_to_title(tolower(x))
                       
                       # Handle special cases with "1ST"
                       x <- str_replace(x, "1st", "First")
                       
                       # Standardize separators
                       x <- str_replace_all(x, " & | And ", " and ")
                       
                       return(x)
                     })
  )
  return(days_str)
}

# Clean the data
park_days_clean <- park_days %>%
  mutate(
    # Clean time format
    noparktime = standardize_time(noparktime),
    
    # Clean days format
    noparkdays = standardize_days(noparkdays)
  ) %>%
  # Split into multiple rows if there are multiple time ranges
  mutate(time_ranges = str_split(noparktime, "\\|")) %>%
  unnest(time_ranges) %>%
  # Create separate columns for start and end times
  separate(time_ranges, 
           into = c("time_start", "time_end"), 
           sep = "-",
           remove = FALSE)

park_days_clean <- park_days_clean %>%
  select(-pkgenday, -enbegin, -enend, -time_start, -time_end, -time_ranges)


park_days_clean <- park_days_clean %>%
  mutate(noparkdays = case_when(
    noparkdays == "Mon" ~ "MON",
    noparkdays == "Tues" ~ "TUE",
    noparkdays == "Wed" ~ "WED",
    noparkdays == "Thur" ~ "THU",
    noparkdays == "First Thur" ~ "FIRST_THU",
    noparkdays == "First Tues" ~ "FIRST_TUE",
    noparkdays == "First Wed" ~ "FIRST_WED",
    noparkdays == "Fri-Sun" ~ "FRI,SAT,SUN",
    noparkdays == "Mon-Fri" ~ "MON,TUE,WED,THU,FRI",
    noparkdays == "Mon-Sat" ~ "MON,TUE,WED,THU,FRI,SAT",
    noparkdays == "Mon-Sat and Fri-Sun" ~ "MON,TUE,WED,THU,FRI,SAT,SUN",
    noparkdays == "Sat-Sun" ~ "SAT,SUN",
    noparkdays == "Sun-Sat" ~ "SUN,MON,TUE,WED,THU,FRI,SAT",
    TRUE ~ noparkdays
  ))

# Step 2: Expand the days into separate rows
park_days_clean <- park_days_clean %>%
  separate_rows(noparkdays, sep = ",")

park_days_clean <- park_days_clean %>%
  st_transform(4326)

# To unnest the split values into separate rows
park_days_clean <- park_days_clean %>%
  mutate(noparktime = str_split(noparktime, "\\|")) %>%
  unnest(noparktime)

park_days_clean <- park_days_clean %>%
  mutate(noparktime = str_trim(noparktime)) %>%
  separate(noparktime, into = c("start_time", "end_time"), sep = "-", remove = FALSE) %>%
  mutate(
    start_time = str_trim(start_time),
    end_time = str_trim(end_time),
    # Convert directly using strptime which is more forgiving
    start_time = format(strptime(start_time, format = "%I%p"), format = "%H:%M"),
    end_time = format(strptime(end_time, format = "%I%p"), format = "%H:%M")
  )

unique(park_days_clean$noparkdays)
park_days_clean <- park_days_clean %>%
  mutate(noparkdays = case_when(
    noparkdays == "MON" ~ 1,
    noparkdays == "TUE" ~ 2,
    noparkdays == "WED" ~ 3,
    noparkdays == "THU" ~ 4,
    noparkdays == "FRI" ~ 5,
    noparkdays == "SAT" ~ 6,
    noparkdays == "FIRST_WED" ~ 3,
    noparkdays == "FIRST_THU" ~ 4,
    noparkdays == "FIRST_TUE" ~ 3,
    noparkdays == "SUN" ~ 0,
  ))

park_days_clean <- park_days_clean %>%
  select(-noparktime)

st_write(park_days_clean, "clean_parking.geojson", append = TRUE)

p_load(lubridate)
p_load(ggplot2)

ggplot(data = park_days_clean) +
  geom_sf(aes(col = noparkdays)) +
  scale_color_viridis_c() + # Adds a continuous color scale (optional)
  theme_minimal() + # Optional: A minimal theme
  labs(color = "No. of Park Days", 
       title = "Park Days Visualization", 
       caption = "Source: park_days_clean dataset")

unique(park_days_time$noparktime)

library(tidyverse)
library(hms)
library(lubridate)
