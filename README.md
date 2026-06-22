
A local-first EPUB reader application built with React Native and Expo. It parses and renders digital books on-device using a sandboxed WebView environment.

## Features
* Local Rendering: Processes and displays EPUB files entirely on your device.

* Sandbox Isolation: Uses an internal WebView layer to bypass native storage and parsing constraints safely.

* Offline Access: Functions fully without an active internet connection after setup.

* Basic Text Controls: Support for core pagination, text tracking, and font scale updates.

## Technical Stack
* Framework: React Native (Expo)

* Rendering Engine: react-native-webview

* Core Parser: epub.js (v0.2.15)

* State Management: Zustand

## Installation & Setup
1. Clone the repository:

```Bash
git clone https://github.com/seyhmusinci/ebook-companion.git
cd ebook-companion
```

2. Install dependencies:

```Bash
npm install
```

3. Start the development server:

```Bash
npx expo start -c
```
