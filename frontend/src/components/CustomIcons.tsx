import React from "react";
import ReactDOMServer from "react-dom/server";

const icons = {
    home: (color = "currentColor") => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 10.5L12 3l9 7.5V21H15v-6H9v6H3V10.5Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  
    characters: (color = "currentColor") => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="8"
          r="4"
          stroke={color}
          strokeWidth="1.8"
        />
        <path
          d="M4.5 21c.6-4.5 3.3-7 7.5-7s6.9 2.5 7.5 7"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  
    campaigns: (color = "currentColor") => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3.5 5.5c3.4-.8 6.2-.3 8.5 1.5v13c-2.3-1.8-5.1-2.3-8.5-1.5v-13Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20.5 5.5c-3.4-.8-6.2-.3-8.5 1.5v13c2.3-1.8 5.1-2.3 8.5-1.5v-13Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  
    items: (color = "currentColor") => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 10h16v10H4V10Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M4 10c.5-4 3.3-6 8-6s7.5 2 8 6"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M4 13h16"
          stroke={color}
          strokeWidth="1.8"
        />
        <path
          d="M10.5 12h3v4h-3v-4Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  
    sessions: (color = "currentColor") => (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 3h8l4 4v14H6V3Z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 3v4h4"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 11h6M9 14h6M9 17h4"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),

    theatre: (color = "currentColor") => (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Back / tragedy mask */}
          <path
            d="M11.5 5.2c2.7-1.4 5.7-1.6 8.5-.5v5.7c0 4.1-2.2 7.1-5.6 8.6"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
      
          <path
            d="M14.7 8.1h.1M17.8 7.6h.1"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
      
          <path
            d="M14.9 12.5c.8-.8 2.1-1 3.1-.4"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
      
          {/* Front / comedy mask */}
          <path
            d="M4 6.3c2.9-1 5.8-.8 8.5.5v5.6c0 4.4-2.3 7.3-4.3 8.4-2-1.1-4.2-4-4.2-8.4V6.3Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
      
          <path
            d="M6.4 10h.1M10 10h.1"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
      
          <path
            d="M6.1 14c1.2 1.3 3 1.3 4.2 0"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
    ),
  };

type IconName = keyof typeof icons;

type CustomIconProps = {
  name: IconName;
  width?: number | string;
  height?: number | string;
  color?: string;
};

const CustomIcon = ({
    name,
    width = 24,
    height = 24,
    color = "currentColor",
  }: CustomIconProps) => {
    const Icon = icons[name];
  
    if (!Icon) {
      console.warn(`Icon "${name}" not found.`);
      return null;
    }
  
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width,
          height,
          flexShrink: 0,
        }}
      >
        {React.cloneElement(Icon(color), {
          width: "100%",
          height: "100%",
        })}
      </span>
    );
  };

// Automatically creates a data URI for every icon in the registry.
// To add another icon, just add it to the `icons` object.
export const iconDataUris = Object.fromEntries(
  Object.entries(icons).map(([key, renderFn]) => {
    const svg = ReactDOMServer.renderToStaticMarkup(
      renderFn("#075272")
    );

    return [
      key,
      `data:image/svg+xml;base64,${btoa(svg)}`,
    ];
  })
) as Record<IconName, string>;

export { icons };

export default CustomIcon;