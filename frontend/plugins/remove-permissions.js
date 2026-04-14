const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function removePermissionsPlugin(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    
    // Remove READ_MEDIA_IMAGES and any other unwanted permissions
    const removePermissions = [
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ];
    
    if (manifest["uses-permission"]) {
      manifest["uses-permission"] = manifest["uses-permission"].filter(
        (perm) => !removePermissions.includes(perm.$?.["android:name"])
      );
    }
    
    return config;
  });
};
