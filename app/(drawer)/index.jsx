import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Animated,
  Pressable,
  Dimensions,
  Platform,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
// import LottieView from "lottie-react-native"; // Disabled - not currently used
import kidimage from "@/assets/images/kidimage.png";

// Dynamic screen dimensions hook
const useScreenDimensions = () => {
  const [screenData, setScreenData] = useState(Dimensions.get("window"));

  useEffect(() => {
    const onChange = (result) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription?.remove();
  }, []);

  return screenData;
};

// Animation configuration - easily customizable
const ANIMATION_CONFIG = {
  background: {
    scaleRange: [1, 1.1],
    translateRange: { x: [-10, 10], y: [-5, 5] },
    duration: 8000,
  },
  title: {
    delay: 300,
    fadeDuration: 800,
    slideDistance: 30,
    initialScale: 0.8,
    springConfig: { tension: 50, friction: 7 },
  },
  lottie: {
    delay: 600,
    fadeDuration: 700,
    initialScale: 0.5,
    springConfig: { tension: 40, friction: 6 },
  },
  button: {
    delay: { withLottie: 900, withoutLottie: 600 },
    springConfig: { tension: 40, friction: 5 },
    opacityDuration: 600,
    pressScale: 0.95,
    pressSpringConfig: { tension: 300, friction: 10 },
  },
};

// Responsive breakpoints
const BREAKPOINTS = {
  small: 375,
  medium: 768,
  large: 1024,
};

// Set to true and provide a Lottie source to enable Lottie animation
const ENABLE_LOTTIE = false;
// Uncomment and provide path when you have a Lottie file:
// Example: const LOTTIE_SOURCE = require('@/assets/animations/kid-character.json');
const LOTTIE_SOURCE = null; // Replace with your Lottie file when ready

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const screenData = useScreenDimensions();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = screenData;

  // Determine screen size category
  const screenSize = useMemo(() => {
    if (SCREEN_WIDTH < BREAKPOINTS.small) return "small";
    if (SCREEN_WIDTH < BREAKPOINTS.medium) return "medium";
    return "large";
  }, [SCREEN_WIDTH]);

  // Determine orientation
  const isLandscape = useMemo(
    () => SCREEN_WIDTH > SCREEN_HEIGHT,
    [SCREEN_WIDTH, SCREEN_HEIGHT]
  );

  // Dynamic spacing multipliers based on screen size
  const spacingMultiplier = useMemo(() => {
    switch (screenSize) {
      case "small":
        return 0.9;
      case "large":
        return 1.1;
      default:
        return 1;
    }
  }, [screenSize]);

  // Background zoom/pan animation
  const backgroundScale = useRef(new Animated.Value(1)).current;
  const backgroundTranslateX = useRef(new Animated.Value(0)).current;
  const backgroundTranslateY = useRef(new Animated.Value(0)).current;

  // Title animations: fade + slide + scale
  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const titleSlideAnim = useRef(
    new Animated.Value(ANIMATION_CONFIG.title.slideDistance)
  ).current;
  const titleScaleAnim = useRef(
    new Animated.Value(ANIMATION_CONFIG.title.initialScale)
  ).current;

  // Lottie animation
  const lottieFadeAnim = useRef(new Animated.Value(0)).current;
  const lottieScaleAnim = useRef(
    new Animated.Value(ANIMATION_CONFIG.lottie.initialScale)
  ).current;

  // Button spring/bounce animation
  const buttonScaleAnim = useRef(new Animated.Value(0)).current;
  const buttonOpacityAnim = useRef(new Animated.Value(0)).current;
  const buttonPressAnim = useRef(new Animated.Value(1)).current;

  // Sequential/staggered animation sequence
  useEffect(() => {
    const bgConfig = ANIMATION_CONFIG.background;
    const [minScale, maxScale] = bgConfig.scaleRange;
    const { x: xRange, y: yRange } = bgConfig.translateRange;

    // 1. Background starts subtle zoom (immediate, continuous loop)
    const backgroundAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(backgroundScale, {
            toValue: maxScale,
            duration: bgConfig.duration,
            useNativeDriver: true,
          }),
          Animated.timing(backgroundTranslateX, {
            toValue: xRange[1],
            duration: bgConfig.duration,
            useNativeDriver: true,
          }),
          Animated.timing(backgroundTranslateY, {
            toValue: yRange[1],
            duration: bgConfig.duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(backgroundScale, {
            toValue: minScale,
            duration: bgConfig.duration,
            useNativeDriver: true,
          }),
          Animated.timing(backgroundTranslateX, {
            toValue: xRange[0],
            duration: bgConfig.duration,
            useNativeDriver: true,
          }),
          Animated.timing(backgroundTranslateY, {
            toValue: yRange[0],
            duration: bgConfig.duration,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    backgroundAnimation.start();

    const titleConfig = ANIMATION_CONFIG.title;
    // 2. Title slides/fades in
    Animated.sequence([
      Animated.delay(titleConfig.delay),
      Animated.parallel([
        Animated.timing(titleFadeAnim, {
          toValue: 1,
          duration: titleConfig.fadeDuration,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlideAnim, {
          toValue: 0,
          duration: titleConfig.fadeDuration,
          useNativeDriver: true,
        }),
        Animated.spring(titleScaleAnim, {
          toValue: 1,
          ...titleConfig.springConfig,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 3. Lottie illustration fades in - only if enabled
    if (ENABLE_LOTTIE) {
      const lottieConfig = ANIMATION_CONFIG.lottie;
      Animated.sequence([
        Animated.delay(lottieConfig.delay),
        Animated.parallel([
          Animated.timing(lottieFadeAnim, {
            toValue: 1,
            duration: lottieConfig.fadeDuration,
            useNativeDriver: true,
          }),
          Animated.spring(lottieScaleAnim, {
            toValue: 1,
            ...lottieConfig.springConfig,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }

    // 4. Button pops in with scale
    const buttonConfig = ANIMATION_CONFIG.button;
    Animated.sequence([
      Animated.delay(
        ENABLE_LOTTIE
          ? buttonConfig.delay.withLottie
          : buttonConfig.delay.withoutLottie
      ),
      Animated.parallel([
        Animated.spring(buttonScaleAnim, {
          toValue: 1,
          ...buttonConfig.springConfig,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacityAnim, {
          toValue: 1,
          duration: buttonConfig.opacityDuration,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    return () => {
      backgroundAnimation.stop();
    };
  }, [
    backgroundScale,
    backgroundTranslateX,
    backgroundTranslateY,
    titleFadeAnim,
    titleSlideAnim,
    titleScaleAnim,
    lottieFadeAnim,
    lottieScaleAnim,
    buttonScaleAnim,
    buttonOpacityAnim,
  ]);

  // Interactive button press animation
  const handlePressIn = () => {
    const buttonConfig = ANIMATION_CONFIG.button;
    Animated.spring(buttonPressAnim, {
      toValue: buttonConfig.pressScale,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    const buttonConfig = ANIMATION_CONFIG.button;
    Animated.spring(buttonPressAnim, {
      toValue: 1,
      ...buttonConfig.pressSpringConfig,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    router.push("/login");
  };

  // Flower component - follows touch smoothly
  const Flower = () => {
    const flowerX = useRef(new Animated.Value(SCREEN_WIDTH / 2)).current;
    const flowerY = useRef(new Animated.Value(SCREEN_HEIGHT / 2)).current;
    const flowerScale = useRef(new Animated.Value(1)).current;
    const flowerRotate = useRef(new Animated.Value(0)).current;
    const containerLayout = useRef({ x: 0, y: 0 });

    // Smooth following animation
    const animateToPosition = (x, y, withBounce = true) => {
      const animations = [
        Animated.spring(flowerX, {
          toValue: x - 30, // Center the flower (30 is half flower size)
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(flowerY, {
          toValue: y - 30,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ];

      if (withBounce) {
        animations.push(
          Animated.sequence([
            Animated.spring(flowerScale, {
              toValue: 1.2,
              tension: 100,
              friction: 3,
              useNativeDriver: true,
            }),
            Animated.spring(flowerScale, {
              toValue: 1,
              tension: 100,
              friction: 3,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(flowerRotate, {
            toValue: flowerRotate._value + 360,
            duration: 500,
            useNativeDriver: true,
          })
        );
      }

      Animated.parallel(animations).start();
    };

    // PanResponder for touch tracking
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const absoluteX = containerLayout.current.x + locationX;
          const absoluteY = containerLayout.current.y + locationY;
          animateToPosition(absoluteX, absoluteY, true);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const absoluteX = containerLayout.current.x + locationX;
          const absoluteY = containerLayout.current.y + locationY;
          // Smoothly follow during move (no bounce)
          Animated.parallel([
            Animated.timing(flowerX, {
              toValue: absoluteX - 30,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(flowerY, {
              toValue: absoluteY - 30,
              duration: 100,
              useNativeDriver: true,
            }),
          ]).start();
        },
        onPanResponderRelease: () => {
          // Slight bounce back on release
          Animated.spring(flowerScale, {
            toValue: 1,
            tension: 100,
            friction: 3,
            useNativeDriver: true,
          }).start();
        },
      })
    ).current;

    // Flower petal positions (5 petals in a circle)
    const petalPositions = [
      { angle: 0, x: 0, y: -25 }, // Top
      { angle: 72, x: 24, y: -8 }, // Top-right
      { angle: 144, x: 15, y: 20 }, // Bottom-right
      { angle: 216, x: -15, y: 20 }, // Bottom-left
      { angle: 288, x: -24, y: -8 }, // Top-left
    ];

    return (
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
        onLayout={(event) => {
          const { x, y } = event.nativeEvent.layout;
          containerLayout.current = { x, y };
        }}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={{
            position: "absolute",
            width: 60,
            height: 60,
            transform: [
              { translateX: flowerX },
              { translateY: flowerY },
              { scale: flowerScale },
              {
                rotate: flowerRotate.interpolate({
                  inputRange: [0, 360],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          }}
        >
          {/* Petals */}
          {petalPositions.map((petal, index) => (
            <View
              key={index}
              style={{
                position: "absolute",
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: colors.primary || "#FF6B9D",
                left: 30 + petal.x - 10,
                top: 30 + petal.y - 10,
                opacity: 0.9,
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                  },
                  android: {
                    elevation: 4,
                  },
                }),
              }}
            />
          ))}
          {/* Center */}
          <View
            style={{
              position: "absolute",
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: "#FFD700",
              left: 22,
              top: 22,
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3,
                },
                android: {
                  elevation: 4,
                },
              }),
            }}
          />
        </Animated.View>
      </View>
    );
  };

  // Dynamic styles that recalculate on screen size/orientation changes
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          overflow: "hidden",
        },
        safeArea: {
          flex: 1,
        },
        imageContainer: {
          flex: 1,
          width: "120%", // Allow for zoom/pan movement
          height: "120%",
        },
        image: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
        },
        content: {
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          width: "100%",
          paddingHorizontal: Math.round(SCREEN_WIDTH * 0.08 * spacingMultiplier),
          paddingVertical: Math.round(SCREEN_HEIGHT * 0.05 * spacingMultiplier),
          ...(isLandscape && {
            flexDirection: "row",
            gap: SCREEN_WIDTH * 0.05,
          }),
        },
        contentVertical: {
          alignItems: "center",
          width: isLandscape ? "50%" : "100%",
        },
        lottieContainer: {
          width: Math.min(
            SCREEN_WIDTH * (isLandscape ? 0.25 : 0.4) * spacingMultiplier,
            isLandscape ? 150 : 180
          ),
          height: Math.min(
            SCREEN_WIDTH * (isLandscape ? 0.25 : 0.4) * spacingMultiplier,
            isLandscape ? 150 : 180
          ),
          marginBottom: Math.round(SCREEN_HEIGHT * 0.03 * spacingMultiplier),
          borderRadius: 20,
          overflow: "hidden",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        lottie: {
          width: "100%",
          height: "100%",
        },
        title: {
          fontSize: Math.max(
            SCREEN_WIDTH * (isLandscape ? 0.04 : 0.06) * spacingMultiplier,
            isLandscape ? 20 : 24
          ),
          fontWeight: "bold",
          color: colors.text,
          marginBottom: Math.round(SCREEN_HEIGHT * 0.04 * spacingMultiplier),
          textAlign: "center",
          paddingHorizontal: Math.round(SCREEN_WIDTH * 0.05 * spacingMultiplier),
          textShadowColor: "rgba(0, 0, 0, 0.3)",
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 4,
          ...(isLandscape && {
            fontSize: Math.max(SCREEN_WIDTH * 0.035, 18),
          }),
        },
        buttonContainer: {
          width: "100%",
          maxWidth: isLandscape ? 250 : 300,
          alignItems: "center",
        },
        button: {
          backgroundColor: colors.primary,
          paddingVertical: Math.round(SCREEN_HEIGHT * 0.018 * spacingMultiplier),
          paddingHorizontal: Math.round(SCREEN_WIDTH * 0.12 * spacingMultiplier),
          borderRadius: 25,
          minWidth: SCREEN_WIDTH * (isLandscape ? 0.5 : 0.6),
          alignItems: "center",
          justifyContent: "center",
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            },
            android: {
              elevation: 6,
            },
          }),
        },
        buttonText: {
          color: colors.text,
          fontWeight: "bold",
          fontSize: Math.max(
            SCREEN_WIDTH * (isLandscape ? 0.035 : 0.045) * spacingMultiplier,
            isLandscape ? 16 : 18
          ),
          letterSpacing: 0.5,
        },
      }),
    [SCREEN_WIDTH, SCREEN_HEIGHT, colors, spacingMultiplier, isLandscape]
  );

  return (
    <SafeAreaView style={dynamicStyles.safeArea} edges={["top", "bottom"]}>
      <View style={dynamicStyles.container}>
        <Animated.View
          style={[
            dynamicStyles.imageContainer,
            {
              transform: [
                { scale: backgroundScale },
                { translateX: backgroundTranslateX },
                { translateY: backgroundTranslateY },
              ],
            },
          ]}
        >
          <ImageBackground source={kidimage} style={dynamicStyles.image}>
            {/* Flower that follows touch */}
            <Flower />
            <View style={dynamicStyles.content}>
              {/* Lottie Animation - Disabled (uncomment and install @lottiefiles/dotlottie-react if needed)
              {ENABLE_LOTTIE && LOTTIE_SOURCE && (
                <Animated.View
                  style={[
                    dynamicStyles.lottieContainer,
                    {
                      opacity: lottieFadeAnim,
                      transform: [{ scale: lottieScaleAnim }],
                    },
                  ]}
                >
                  <LottieView
                    source={LOTTIE_SOURCE}
                    autoPlay
                    loop
                    style={dynamicStyles.lottie}
                    speed={1.2}
                    colorFilters={[
                      { keypath: "**", color: colors.primary },
                    ]}
                  />
                </Animated.View>
              )}
              */}

              <View style={dynamicStyles.contentVertical}>
                {/* Title with fade + slide + scale animation */}
                <Animated.Text
                  style={[
                    dynamicStyles.title,
                    {
                      opacity: titleFadeAnim,
                      transform: [
                        { translateY: titleSlideAnim },
                        { scale: titleScaleAnim },
                      ],
                    },
                  ]}
                >
                  {t("welcome")}
                </Animated.Text>

                {/* Button with spring/bounce and press feedback */}
                <Animated.View
                  style={[
                    dynamicStyles.buttonContainer,
                    {
                      opacity: buttonOpacityAnim,
                      transform: [
                        {
                          scale: Animated.multiply(
                            buttonScaleAnim,
                            buttonPressAnim
                          ),
                        },
                      ],
                    },
                  ]}
                >
                  <Pressable
                    style={({ pressed }) => [
                      dynamicStyles.button,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={handlePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                  >
                    <Text style={dynamicStyles.buttonText}>
                      {t("startLearning")}
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
