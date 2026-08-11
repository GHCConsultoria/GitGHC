import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
      <span style={{ color: "#2dd4bf", fontSize: 20, fontWeight: 800, fontFamily: "system-ui", letterSpacing: -1 }}>
        Z
      </span>
    </div>,
    { ...size },
  );
}
