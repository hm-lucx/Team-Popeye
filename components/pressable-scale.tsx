import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

// AnimatedPressable = Pressable, der Reanimated-Stile verstehen kann
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Wie ein normaler Pressable, aber mit sanftem Druck-Effekt:
 * - onPressIn  → scale fällt mit withSpring auf 0.96 (96% Größe)
 * - onPressOut → scale federt mit withSpring zurück auf 1 (100%)
 * withSpring simuliert eine Federkraft: weich, nie ruckartig.
 */
export default function PressableScale({ onPress, style, children }: Props) {
  // Gemeinsamer Animationswert; startet bei 1 (= normale Größe)
  const scale = useSharedValue(1);

  // Wird bei jedem Frame neu berechnet und als CSS-Transform übergeben
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        // Finger berührt: sanft auf 96 % schrumpfen
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        // Finger loslassen: zurück auf 100 % federn
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
