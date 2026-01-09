const { notarize } = require('@electron/notarize');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon',
    appBundleId: 'com.sendit.app',
    appCategoryType: 'public.app-category.developer-tools',
    osxSign: process.env.APPLE_ID
      ? {
          identity: process.env.APPLE_IDENTITY || 'Developer ID Application: Your Name (TEAM_ID)',
          hardenedRuntime: true,
          entitlements: './entitlements.mac.plist',
          entitlementsInherit: './entitlements.mac.plist',
          gatekeeperAssess: false,
        }
      : {},
    afterSign: async (params) => {
      if (process.env.APPLE_ID && params.electronPlatformName === 'darwin') {
        try {
          await notarize({
            appBundleId: 'com.sendit.app',
            appPath: params.appPath,
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
          });
        } catch (error) {
          console.warn('Notarization failed:', error);
        }
      }
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        background: './assets/dmg-background.png',
        format: 'UDZO',
        icon: './assets/icon.icns',
        iconSize: 128,
        contents: [
          { x: 380, y: 280, type: 'link', path: '/Applications' },
          { x: 110, y: 280, type: 'file', path: 'Send-It.app' },
        ],
        additionalDMGOptions: {
          window: {
            size: {
              width: 540,
              height: 380,
            },
          },
        },
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer/index.tsx',
              name: 'main_window',
              preload: {
                js: './src/preload.ts',
              },
            },
          ],
        },
        devContentSecurityPolicy: "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval';",
      },
    },
  ],
};
