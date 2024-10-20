library(sf)
library(dplyr)
emotions <- st_read("./data/layers/emotions.geojson")

emotions_main <- emotions %>% filter(question %in% c(1:8)) %>%
  mutate(sentiment= if_else(question %in% c(1, 2), 'Happy',
                                       if_else(question %in% c(3,6,7,8),
                                               'Unhappy', 'Unsafe')))
emotions_main %>% st_write("./data/layers/emotions_main.geojson")
