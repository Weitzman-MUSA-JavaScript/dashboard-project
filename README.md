# Vrinda-Uber-Dashboard-Project


Google Maps is at the core of this project—it's the canvas for planning trips and visualizing stops.
I've used the Google Maps API for displaying the map, calculating routes, and providing directions.
Users can interact with the map directly, select their starting point, destinations, add stops, and calculate the complete route with an estimated fare.


Add Stops & Custom Itineraries:

Users can customize their trips by adding stops between their start and final destinations. This is handy for adding quick coffee breaks, restaurant visits, or even sightseeing stops.
The interface lets users select how long they want to spend at each stop, and all of this is calculated into the trip duration.

Fare & Route Calculation:

I've implemented Google Maps Directions Service to calculate the complete route.
It sums up the total distance, estimated driving duration, and adds the time spent at each stop, giving users a complete overview of their trip, much like the summary you see when booking an Uber ride.

Where Things Stand Now:

The project is still a work in progress, with core features like Google Maps integration, adding stops, and fare calculation working well.
I'm still ironing out the Yelp API integration and improving the drawing functionality so users can more intuitively mark areas and get information about them.
It’s far from finished, but I’m determined to keep working on it and make it the all-in-one journey planner I envisioned.
How This Tool Helps Users (And Uber)
A Better Ride Experience: Rather than just offering a basic point A to B service, this tool helps riders plan an entire journey—choosing stops, calculating fares, and exploring places along the way.
Explore While You Travel: Whether it's a long road trip or just a ride across town, users can explore local areas, find great restaurants, and decide on stops without needing to switch between different apps.
More Informed Decisions: By integrating review data (thanks to Yelp), the tool helps users pick better spots for food, attractions, and other services.
The Current Challenges
Yelp API Integration:

The idea was to let users "draw" on the map to create a custom area of interest. This feature is inspired by property search tools and seemed like a great way to narrow down restaurant searches, but there are still improvements to be made. The basic drawing works, but making it smoother and more user-friendly is next on my list.
