/**
 * Module for sidebar tabs that control economic and climate analysis
 */

/**
 * Updates tab button based on which is clicked, and change sidebar accordingly.
 */
function setupSidebarTabs() {
  const btnEcon = document.getElementById('tab-economic');
  const btnClimate = document.getElementById('tab-climate');
  const panelEcon = document.getElementById('panel-economic');
  const panelClimate = document.getElementById('panel-climate');

  if (!btnEcon || !btnClimate) return;

  btnEcon.addEventListener('click', () => {
    // Activate Economic
    btnEcon.classList.add('active');
    panelEcon.classList.add('active');
    // Deactivate Climate
    btnClimate.classList.remove('active');
    panelClimate.classList.remove('active');
  });

  btnClimate.addEventListener('click', () => {
    // Activate Climate
    btnClimate.classList.add('active');
    panelClimate.classList.add('active');
    // Deactivate Economic
    btnEcon.classList.remove('active');
    panelEcon.classList.remove('active');
  });
}

export { setupSidebarTabs };
