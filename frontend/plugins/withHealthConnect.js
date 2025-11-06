const { withMainActivity, AndroidConfig } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for react-native-health-connect
 * Modifies MainActivity to properly register Activity Result Launcher
 */
const withHealthConnect = config => {
  return withMainActivity(config, async config => {
    const { modResults } = config;
    let contents = modResults.contents;

    // 1. Import 추가
    const importStatement = `import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate`;
    if (!contents.includes(importStatement)) {
      // package 선언 바로 다음에 import 추가
      contents = contents.replace(
        /(package com\.pacetry\.app\nimport expo\.modules\.splashscreen\.SplashScreenManager)/,
        `$1\n${importStatement}`
      );
    }

    // 2. Property 선언 추가
    const propertyDeclaration = `  private val healthConnectPermissionDelegate by lazy {
    HealthConnectPermissionDelegate(this)
  }`;

    if (!contents.includes('healthConnectPermissionDelegate')) {
      // MainActivity 클래스 시작 부분에 추가
      contents = contents.replace(
        /(class MainActivity : ReactActivity\(\) \{)/,
        `$1\n${propertyDeclaration}\n`
      );
    }

    modResults.contents = contents;
    return config;
  });
};

module.exports = withHealthConnect;
