library(sf)
library(dplyr)
library(tidyverse)
emotions <- st_read("./data/layers/emotions.geojson")

emotions_main <- emotions %>% filter(question %in% c(1:8)) %>%
   mutate(sentiment= if_else(question %in% c(1), 'Happy',
                            if_else(question %in% c(2), 'Proud',
                                       if_else(question %in% c(3,7),'Unhappy',
                                             if_else(question%in%c(4), 'Unsafe',
                                               if_else(question %in% c(5,6), 'Dissatisfied (Transport)',
                                               if_else(question %in% c(8), 'Disgust', 'Others'))))))) %>% drop_na()
       
emotions_main %>% st_write("./data/layers/emotions_main.geojson", overwrite=T)
