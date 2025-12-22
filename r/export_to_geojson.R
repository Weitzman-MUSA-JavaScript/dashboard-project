# Purpose -------------------------------------------------------------------------------------
# Read SEPTA's GTFS feeds pre- and post-cuts and export needed subsets of data as geojson files.

# Preliminaries -------------------------------------------------------------------------------

library(tidyverse)
library(tidylog)
library(janitor)
library(tidytransit)
library(sf)

# Set path relative to location of this script
setwd(dirname(this.path::this.dir()))

data_dir <- str_c(getwd(), "/data")

# Geographic data -----------------------------------------------------------------------------

districts <- read_sf(str_c(data_dir, "raw", "geographic_areas", "Pennsylvania_Senate_Districts.geojson", sep = "/")) %>% 
  # Only select SEPTA-area districts
  filter(LEG_DISTRICT_NO %in% c(1:9, 10, 12, 17, 19, 24, 26, 44)) %>% 
  clean_names()

# Pre-cut data --------------------------------------------------------------------------------

normal_raw <- read_gtfs(str_c(data_dir, "raw", "septa_normal", "google_bus.zip", sep = "/"))

# Read shapes and stops as sf objects for mapping
normal_sf <- gtfs_as_sf(normal_raw)

# Route linestrings
normal_geometry <- normal_sf[["shapes"]]

normal_routes <- normal_sf[["routes"]]

normal_trips <- normal_sf[["trips"]]

# Post-cut data --------------------------------------------------------------------------------

cut_raw <- read_gtfs(str_c(data_dir, "raw", "septa_cut", "google_bus.zip", sep = "/"))

# Read shapes and stops as sf objects for mapping
cut_sf <- gtfs_as_sf(cut_raw)

# Route linestrings
cut_geometry <- cut_sf[["shapes"]]

cut_routes <- cut_raw[["routes"]]

cut_trips <- cut_raw[["trips"]]

# Collating information -----------------------------------------------------------------------

# Identify routes which do not exist post-cut
routes_eliminated <- cut_routes %>% 
  filter(str_detect(route_long_name, "ELIMINATED")) %>% 
  pull(route_id)

# Identify routes with reduced stops
# From: https://billypenn.com/2025/08/24/septa-cuts-routes-fares-august-2025/
routes_shortened <- 
  c(2, 3, 5, 7, 9, 17, 27, 43, 61, 84, 115, 124, 125, 433, 441, 495)

# Associate linestrings with route numbers
normal_mapping_data_all <- normal_geometry %>% 
  left_join(normal_trips %>% distinct(shape_id, route_id)) %>% 
  mutate(cut_status = 
           case_when(route_id %in% routes_eliminated ~ "Eliminated",
                     route_id %in% routes_shortened ~ "Shortened",
                     .default = "Remaining"))

# Associate linestrings with route numbers
cut_mapping_data_all <- cut_geometry %>% 
  left_join(cut_trips %>% distinct(shape_id, route_id)) %>% 
  mutate(cut_status = 
           case_when(route_id %in% routes_eliminated ~ "Eliminated",
                     route_id %in% routes_shortened ~ "Shortened",
                     .default = "Remaining"))

# Get district-level summary ------------------------------------------------------------------

district_cuts <- normal_mapping_data_all %>% 
  st_join(districts) %>% 
  st_drop_geometry() %>% 
  distinct(route_id, cut_status, leg_district_no) %>% 
  group_by(leg_district_no, cut_status) %>% 
  summarize(routes = n()) %>% 
  mutate(percent = routes / sum(routes)) %>% 
  pivot_wider(names_from = cut_status, values_from = c(routes, percent), values_fill = 0) %>% 
  clean_names() %>% 
  mutate(across(contains("percent"), ~ scales::label_percent()(.))) %>%
  right_join(districts, by = "leg_district_no") %>% 
  st_as_sf()

# Export --------------------------------------------------------------------------------------

st_write(normal_mapping_data_all, 
             str_c(data_dir, "/overall_network.json"), 
             driver = "GeoJSON")

st_write(district_cuts, 
         str_c(data_dir, "/districts.json"), 
         driver = "GeoJSON")


