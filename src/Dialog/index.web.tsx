import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import Header, { HEADER_CLEARANCE, HEADER_OVERHANG } from "./Header";
import type { DialogProps } from "./types";

const Dialog = ({ children, isVisible, hide, style }: DialogProps) => (
  <Modal
    animationType="fade"
    visible={isVisible}
    onDismiss={hide}
    onRequestClose={hide}
    transparent
  >
    <View style={styles.modal}>
      <TouchableOpacity
        activeOpacity={1} // No feedback, the modal closing is the feedback
        onPress={hide}
        style={styles.underlay}
      />
      <View style={[styles.dialog, style]}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: HEADER_CLEARANCE,
            // react-native-web supports CSS calc() strings; RN's style types
            // don't know about them. dvh (not vh) so the cap tracks the
            // visible viewport when the mobile URL bar is expanded.
            maxHeight: `calc(100dvh - ${
              HEADER_OVERHANG * 2 + 64
            }px)` as unknown as number,
          }}
        >
          {children}
        </ScrollView>
        <Header />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  underlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modal: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  dialog: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    marginTop: HEADER_OVERHANG,
  },
});

export default Dialog;
