"use client";

import { PlateElement } from "platejs/react";

export default function CodeLineElement(props: any) {
  return (
    <PlateElement
      {...props}
      as="div"
      style={{
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      {props.children}
    </PlateElement>
  );
}
