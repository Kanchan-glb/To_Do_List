export const getLayoutStorageKey = (pageName) => {
  const userName = localStorage.getItem("smartName") || "User";
  const userEmail = localStorage.getItem("smartEmail") || "default";
  const userId = userEmail !== "default" ? userEmail : userName;
  return `layout_${userId}_${pageName}`;
};

export const loadLayout = (pageName, defaultLayout) => {
  try {
    const key = getLayoutStorageKey(pageName);
    const saved = localStorage.getItem(key);
    
    if (saved) {
      const savedLayoutIds = JSON.parse(saved);
      
      // Preserve saved order and filter out removed items
      const newLayout = savedLayoutIds.filter(id => defaultLayout.includes(id));
      
      // Append any new widgets that were added to defaultLayout but are not in savedLayout
      const savedIdSet = new Set(savedLayoutIds);
      const newWidgets = defaultLayout.filter(id => !savedIdSet.has(id));
      
      return [...newLayout, ...newWidgets];
    }
  } catch (e) {
    console.error(`Failed to load layout for ${pageName}`, e);
  }
  return defaultLayout;
};

export const saveLayout = (pageName, layoutIds) => {
  try {
    const key = getLayoutStorageKey(pageName);
    localStorage.setItem(key, JSON.stringify(layoutIds));
  } catch (e) {
    console.error(`Failed to save layout for ${pageName}`, e);
  }
};

export const clearLayout = (pageName) => {
  try {
    const key = getLayoutStorageKey(pageName);
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Failed to clear layout for ${pageName}`, e);
  }
};
