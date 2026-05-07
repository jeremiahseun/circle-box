import type { RefObject } from 'react';
import { requireNativeModule } from './native';
import type { CircleBoxSubscription, NavigationContainerRefLike } from './types';

/**
 * Creates a React Navigation state-change listener that automatically records
 * `screen_view` events into the CircleBox ring buffer.
 *
 * Attach the returned listener to a `NavigationContainer`'s `onStateChange` prop:
 *
 * ```tsx
 * import { NavigationContainer } from '@react-navigation/native';
 * import { createCircleBoxNavigationListener } from 'circlebox-react-native';
 *
 * const navigationRef = React.useRef(null);
 * const { onStateChange } = createCircleBoxNavigationListener(navigationRef);
 *
 * <NavigationContainer ref={navigationRef} onStateChange={onStateChange}>
 *   ...
 * </NavigationContainer>
 * ```
 */
export function createCircleBoxNavigationListener(
  navigationRef: RefObject<NavigationContainerRefLike | null>,
): { onStateChange: () => void } {
  return {
    onStateChange: () => {
      const current = navigationRef.current?.getCurrentRoute();
      if (!current?.name) return;
      const name = current.name;
      const native = requireNativeModule();
      if (native.screenView) {
        void native.screenView(name, {});
      } else {
        void native.breadcrumb('screen_view', { screen: name });
      }
    },
  };
}

/**
 * Returns a no-op subscription object for symmetry with other CircleBox subscription APIs.
 * The `onStateChange` callback returned by {@link createCircleBoxNavigationListener} is
 * stateless and needs no explicit cleanup.
 */
export function useCircleBoxNavigationTracking(
  _navigationRef: RefObject<NavigationContainerRefLike | null>,
): CircleBoxSubscription {
  return { remove: () => {} };
}
