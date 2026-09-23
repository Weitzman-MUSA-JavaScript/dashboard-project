# Project Instructions: Decision Support Tool

While dashboards are a common way to display data, this project challenges you to build a **decision support tool**. Your goal is to use data to build visualizations and analyses that help users make informed choices. The focus of this project is *actionable data delivery* -- ensuring the right information is presented to the user at the right time and in the right context.

## Samples

Find examples of previous dashboard and interactive tool projects at <https://github.com/Weitzman-MUSA-JavaScript/dashboard-project-examples>.

## Guidance

* **Keep large data files out of your repository.** GitHub will block files larger than ~100MB. Talk to your instructors if you need guidance on where to host large data files.
* **Simplify your geospatial data** appropriately (i.e., right-sized for your use case) to reduce file size and improve performance.
* **Start simple.** Because you are building this from scratch, get a basic map and a single interactive element working before adding more complexity.

## Timeline

We will allocate weeks 5-8 (four weeks) of the semester to this project.

### Step 1: Define the problem and audience

Before writing any code, define the purpose of your tool. A tool built for "everyone" is usually useful to no one. To guide your project, complete the following statements:

* **The users I want to empower are...** (e.g., transit riders, city planners, park rangers)
* **The specific decisions those users need to make are...** (e.g., "when to leave for the bus", "where to allocate road repair funds")
* **The data required to inform these decisions is...**

Use the decisions you want to enable to evaluate any dataset or interactive element you add to your tool. If a feature doesn't help the user make their decision, leave it out. Whatever data you use, **be sure to include citations somewhere in your app interface**.

### Step 2: Plan the Interface

Since you are building this application from scratch (without a starter template), take some time to plan the layout and interactivity of your tool. Think about:
* The map and how spatial information will be displayed.
* The UI controls (buttons, checkboxes, search bars, sliders) needed to filter or explore the data.
* Additional context (charts, summary text, popups) that updates based on user interaction to provide clear, actionable insights.

### Step 3: Build the application (Suggested Milestones)

You will create your HTML, CSS, and JavaScript from scratch. While you can build the application however you see fit, here is a suggested workflow to keep you on track:

* **Milestone 1: The Foundation.** Set up your basic HTML page structure and link your CSS and JS files. Initialize a Leaflet map and load a basemap tile layer.
* **Milestone 2: Data Delivery.** Fetch your data (e.g., GeoJSON or parsed CSV) into your environment and display it on the map as a layer.
* **Milestone 3: Interactivity.** Create HTML elements for your UI controls. In your JavaScript, select those DOM elements, add event listeners, and write functions to filter the data or update the display when the user interacts with them.

### Step 4: Check your code

* **Code Quality:** Ensure your JavaScript and CSS code are properly linted using ESLint and Stylelint.
* **Responsiveness:** Check that your tool works well on both desktop and mobile browser window sizes.
* **Accessibility (a11y):** Verify that your tool is free from major accessibility issues. Check for accessible color contrast and use tools like the Axe DevTools browser extension.

### Step 5: Submit your project

Commit your code and push it to your repository on GitHub. Set up GitHub Pages on the repository and submit a new pull request into the original project repository in the class organization.

#### Submission Checklist

- [ ] Pushed latest code to the `main` branch of your repository
- [ ] Updated the `README.md` file with a description of your project, the intended users, the decisions it supports, and data citations.
- [ ] Linted JS and CSS code
- [ ] Verified a11y of your site
- [ ] Turned on GitHub Pages for the repository and verified that your site works when deployed
- [ ] Submitted a pull request to the original repository in the class organization
- [ ] In the PR **title**, included your name at least
- [ ] In the PR **description**, included your guiding statements (users, decisions) and a brief description of the tool
