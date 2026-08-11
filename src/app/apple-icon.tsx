import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0b0d",
      }}
    >
      <span style={{ color: "#2dd4bf", fontSize: 108, fontWeight: 800, fontFamily: "system-ui", letterSpacing: -4 }}>
        Z
      </span>
    </div>,
    { ...size },
  );
}
