// ============================================================================
// Component Loader Module
// Asynchronously fetches HTML component templates and injects them into the DOM.
// ============================================================================

// Loads an HTML template file and mounts it inside a target container element.
export async function loadComponent(containerId, componentUrl) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[ComponentLoader] Target container #${containerId} not found.`);
    return false;
  }

  try {
    const response = await fetch(componentUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const htmlContent = await response.text();
    container.innerHTML = htmlContent;
    console.log(`[ComponentLoader] Mounted ${componentUrl} into #${containerId}`);
    return true;
  } catch (error) {
    console.error(`[ComponentLoader] Failed to load component from "${componentUrl}":`, error);
    return false;
  }
}
