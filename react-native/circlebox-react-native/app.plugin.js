const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const pkg = require('./package.json');

function resolveConfigPlugins() {
    try {
        return require('@expo/config-plugins');
    } catch {
        try {
            // For monorepo `file:` links, resolve from the consuming app context.
            const appRequire = createRequire(`${process.cwd()}/package.json`);
            return appRequire('@expo/config-plugins');
        } catch {
            return null;
        }
    }
}

function withLocalCircleBoxSDKPod(config, configPlugins) {
    const repoRoot = path.resolve(__dirname, '../..');
    const localPodspecPath = path.join(repoRoot, 'CircleBoxSDK.podspec');

    // Only patch Podfile in local monorepo development mode.
    if (!fs.existsSync(localPodspecPath)) {
        return config;
    }

    return configPlugins.withDangerousMod(config, [
        'ios',
        async (configState) => {
            const podfilePath = path.join(configState.modRequest.platformProjectRoot, 'Podfile');
            if (!fs.existsSync(podfilePath)) {
                return configState;
            }

            let podfile = fs.readFileSync(podfilePath, 'utf8');
            if (podfile.includes("pod 'CircleBoxSDK'")) {
                return configState;
            }

            const normalizedRepoRoot = repoRoot.replace(/\\/g, '/');
            const podLine = `  pod 'CircleBoxSDK', :path => '${normalizedRepoRoot}'`;

            if (/^\s*use_expo_modules!\s*$/m.test(podfile)) {
                podfile = podfile.replace(/^\s*use_expo_modules!\s*$/m, (line) => `${line}\n${podLine}`);
            } else if (/^\s*target\s+['"].+['"]\s+do\s*$/m.test(podfile)) {
                podfile = podfile.replace(/^\s*target\s+['"].+['"]\s+do\s*$/m, (line) => `${line}\n${podLine}`);
            } else {
                return configState;
            }

            fs.writeFileSync(podfilePath, podfile);
            return configState;
        },
    ]);
}

const withCircleBoxReactNative = (config) => {
    const configPlugins = resolveConfigPlugins();
    if (!configPlugins) {
        return config;
    }

    return withLocalCircleBoxSDKPod(config, configPlugins);
};

const configPlugins = resolveConfigPlugins();
const createRunOncePlugin = configPlugins?.createRunOncePlugin;

module.exports =
    typeof createRunOncePlugin === 'function'
        ? createRunOncePlugin(withCircleBoxReactNative, pkg.name, pkg.version)
        : withCircleBoxReactNative;
