import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { useBookStore } from '../store/bookStore';

interface EpubViewerProps {
  onPageTurn: (pageText: string) => void;
  onTextSelect: (selectedText: string) => void;
  bookUrl: string;
  bookId: string;
  savedCfi?: string | null;
}

// epub.js 0.3.x needs JSZip loaded BEFORE it to read .epub (zip) archives.
// Both are bundled locally rather than fetched at runtime.
// Download:
//   assets/jszip.bundle.txt  <- https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js
//   assets/epub.bundle.txt   <- https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js
// Both saved with a .txt extension so Metro treats them as static assets.
const JSZIP_LIB_MODULE = require('../assets/jszip.bundle.txt');
const EPUB_LIB_MODULE = require('../assets/epub.bundle.txt');

export default function EpubViewer({ onPageTurn, onTextSelect, bookUrl, bookId, savedCfi }: EpubViewerProps) {
  const webViewRef = useRef<WebView>(null);
  const { fontSize, updateLocation } = useBookStore();
  const [viewerHtmlPath, setViewerHtmlPath] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeLocalViewerAssets() {
      if (!bookUrl) return;
      setIsProcessing(true);
      setInitError(null);

      try {
        // 1. Resolve the bundled JSZip + epub.js assets and copy them next to our HTML shell.
        const jszipAsset = Asset.fromModule(JSZIP_LIB_MODULE);
        const epubAsset = Asset.fromModule(EPUB_LIB_MODULE);
        await Promise.all([jszipAsset.downloadAsync(), epubAsset.downloadAsync()]);

        if (!jszipAsset.localUri) {
          throw new Error('Could not resolve bundled jszip.min.js asset URI');
        }
        if (!epubAsset.localUri) {
          throw new Error('Could not resolve bundled epub.min.js asset URI');
        }

        const jszipTargetUri = `${FileSystem.cacheDirectory}jszip_core.js`;
        const epubTargetUri = `${FileSystem.cacheDirectory}epub_core.js`;
        await Promise.all([
          FileSystem.copyAsync({ from: jszipAsset.localUri, to: jszipTargetUri }),
          FileSystem.copyAsync({ from: epubAsset.localUri, to: epubTargetUri }),
        ]);

        // 2. Sanity-check the book file actually exists before handing it to the WebView.
        const bookInfo = await FileSystem.getInfoAsync(bookUrl);
        if (!bookInfo.exists) {
          throw new Error(`Book file not found at: ${bookUrl}`);
        }

        // 3. Pass the book URL to the WebView as a JSON string literal, never
        // by raw template interpolation, and never decode it — it's already
        // a valid file:// URI from expo-file-system / DocumentPicker.
        const safeBookUrl = JSON.stringify(bookUrl);
        const safeSavedCfi = JSON.stringify(savedCfi ?? null);

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <style>
              html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #FFF; }
              #viewer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; }
              #left-zone, #right-zone { position: absolute; top: 0; bottom: 0; width: 15%; z-index: 10; }
              #left-zone { left: 0; } #right-zone { right: 0; }
            </style>
            <script src="./jszip_core.js"></script>
            <script src="./epub_core.js"></script>
          </head>
          <body>
            <div id="left-zone" onclick="window.rendition && window.rendition.prev()"></div>
            <div id="right-zone" onclick="window.rendition && window.rendition.next()"></div>
            <div id="viewer"></div>

            <script>
              function log(msg) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'BROWSER_CONSOLE_LOG',
                  payload: String(msg)
                }));
              }

              window.onerror = function(message, source, lineno, colno, error) {
                log('RUNTIME LOG ERROR: ' + message + ' (line ' + lineno + ')');
              };

              async function bootReader() {
                try {
                  if (typeof JSZip === 'undefined') {
                    log('WARNING: JSZip did not load — epub.js may fail to read the .epub archive. Check jszip_core.js exists next to viewer_sandbox.html.');
                  } else {
                    log('JSZip loaded OK.');
                  }

                  if (typeof ePub === 'undefined') {
                    log('FATAL: epub_core.js did not load — ePub is undefined. Check that epub_core.js exists next to viewer_sandbox.html and that file access is enabled.');
                    return;
                  }
                  log('epub.js loaded OK. Booting with bookUrl: ' + ${safeBookUrl});

                  log('typeof ePub: ' + typeof ePub + ', ePub.VERSION: ' + (window.ePub && window.ePub.VERSION));

                  window.book = ePub(${safeBookUrl});

                  function startRender() {
                    log('Rendering...');
                    window.rendition = window.book.renderTo('viewer', {
                      width: '100%',
                      height: '100%',
                      flow: 'paginated',
                      spread: 'none'
                    });

                    var savedCfi = ${safeSavedCfi};
                    var displayTarget = savedCfi || undefined;

                    if (savedCfi) {
                      log('Restoring saved position: ' + savedCfi);
                    }

                    if (window.rendition.display) {
                      var displayResult = window.rendition.display(displayTarget);
                      if (displayResult && displayResult.then) {
                        displayResult
                          .then(function () { log('rendition.display() resolved — should be visible now.'); })
                          .catch(function (err) {
                            log('rendition.display(savedCfi) FAILED, falling back to start: ' + (err && err.message ? err.message : JSON.stringify(err)));
                            // Saved CFI may be stale (e.g. book file changed) — fall back gracefully.
                            window.rendition.display();
                          });
                      } else {
                        log('rendition.display() called (no promise returned, assuming sync/legacy API).');
                      }
                    }

                    bindLocationEvents();
                  }

                  function bindLocationEvents() {
                    var emitter = window.rendition || window.book;
                    var eventName = window.rendition ? 'relocated' : 'book:pageChanged';

                    emitter.on(eventName, function (location) {
                      var cfi = (location && location.start && location.start.cfi)
                        ? location.start.cfi
                        : null;

                      if (cfi) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'LOCATION_CHANGE',
                          payload: cfi
                        }));
                      }

                      try {
                        var iframe = document.querySelector('#viewer iframe');
                        var text = iframe && iframe.contentDocument
                          ? iframe.contentDocument.body.innerText
                          : '';
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'PAGE_TURN',
                          payload: text.substring(0, 1500)
                        }));
                      } catch (e) {
                        log('Could not extract page text: ' + e.message);
                      }
                    });
                  }

                  // Detect API shape: 0.3.x exposes book.ready as a real Promise.
                  // 0.2.x's book.ready may not exist or may not be thenable.
                  if (window.book.ready && typeof window.book.ready.then === 'function') {
                    log('Using 0.3.x-style promise API (book.ready).');
                    window.book.ready
                      .then(startRender)
                      .catch(function (err) {
                        log('book.ready FAILED: ' + (err && err.message ? err.message : JSON.stringify(err)));
                      });
                  } else {
                    log('book.ready is not a promise — falling back to legacy 0.2.x event API.');
                    if (typeof window.book.on === 'function') {
                      window.book.on('book:ready', startRender);
                    } else {
                      // Last resort: just try rendering immediately.
                      startRender();
                    }
                  }

                  document.addEventListener('selectionchange', function () {
                    var sel = window.getSelection();
                    if (sel && sel.toString().trim().length > 0) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'TEXT_SELECT',
                        payload: sel.toString()
                      }));
                    }
                  });
                } catch (e) {
                  log('Initialization Exception: ' + e.message);
                }
              }

              bootReader();
            </script>
          </body>
          </html>
        `;

        const localTargetUri = `${FileSystem.cacheDirectory}viewer_sandbox.html`;
        await FileSystem.writeAsStringAsync(localTargetUri, htmlContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        setViewerHtmlPath(localTargetUri);
      } catch (err: any) {
        console.error('Failed executing filesystem pipeline setup steps:', err);
        setInitError(err.message);
      } finally {
        setIsProcessing(false);
      }
    }

    initializeLocalViewerAssets();
  }, [bookUrl, bookId]);

  useEffect(() => {
    if (webViewRef.current && viewerHtmlPath) {
      webViewRef.current.injectJavaScript(`
        if (window.rendition) { window.rendition.themes.fontSize("${fontSize}px"); }
        true;
      `);
    }
  }, [fontSize, viewerHtmlPath]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'BROWSER_CONSOLE_LOG':
          console.log('\x1b[33m[WebView Console]\x1b[0m', data.payload);
          break;
        case 'TEXT_SELECT':
          onTextSelect(data.payload);
          break;
        case 'PAGE_TURN':
          onPageTurn(data.payload);
          break;
        case 'LOCATION_CHANGE':
          updateLocation(data.payload);
          break;
      }
    } catch (e) {
      console.error('Bridge parse validation exception:', e);
    }
  };

  if (initError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: 'red' }}>Sandbox Mount Error: {initError}</Text>
      </View>
    );
  }

  if (isProcessing || !viewerHtmlPath) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Preparing reader…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ uri: viewerHtmlPath }}
        onMessage={handleMessage}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('\x1b[31m[WebView Error]\x1b[0m', nativeEvent.description);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('\x1b[31m[WebView HTTP Error]\x1b[0m Status Code:', nativeEvent.statusCode);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 13, color: '#868E96', textAlign: 'center' },
  webview: { flex: 1 },
});