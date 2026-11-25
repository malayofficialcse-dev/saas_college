import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4779B8',
          hover: '#38699F',
          light: '#EDF3FA',
        },
        background: {
          DEFAULT: '#F5F6F8',
          surface: '#FFFFFF',
          'surface-secondary': '#F9FAFB',
        },
        typography: {
          primary: '#202938',
          secondary: '#667085',
          muted: '#98A2B3',
        },
        border: {
          DEFAULT: '#E5E7EB',
          strong: '#D0D5DD',
        },
        status: {
          success: '#26966A',
          'success-light': '#EBF7F2',
          warning: '#D99A3D',
          'warning-light': '#FDF5E8',
          danger: '#D9534F',
          'danger-light': '#FCEEEE',
          info: '#4779B8',
          'info-light': '#EDF3FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        xs: '4px',
        sm: '4px',
        DEFAULT: '4px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
        full: '4px',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
      },
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(16, 24, 40, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px 0 rgba(16, 24, 40, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
