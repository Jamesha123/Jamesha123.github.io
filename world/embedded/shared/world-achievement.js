(function (global) {
  function unlockWorldAchievement(id) {
    if (!id) {
      return;
    }

    const message = { type: "world-achievement-unlock", id: id };

    try {
      if (global.parent && global.parent !== global) {
        global.parent.postMessage(message, "*");
      }
      if (global.top && global.top !== global && global.top !== global.parent) {
        global.top.postMessage(message, "*");
      }
    } catch (_error) {
      // Ignore cross-origin postMessage errors.
    }
  }

  global.unlockWorldAchievement = unlockWorldAchievement;
})(window);
