import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  StatusBar,
  Text,
  TouchableOpacity,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"; // Updated Import
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import EpubViewer, { EpubViewerHandle, TocItem } from "./components/EpubViewer";
import CompanionPanel from "./components/CompanionPanel";
import TocPanel from "./components/TocPanel";
import ApiKeyModal from "./components/ApiKeyModal";
import { fetchPageInsights, PageInsight } from "./services/groq";
import { groqQueue } from "./services/queue";
import { useCacheStore } from "./store/cacheStore";
import { useBookStore } from "./store/bookStore";

export default function App() {
  const [localBookUrl, setLocalBookUrl] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeData, setActiveData] = useState<PageInsight | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const epubViewerRef = useRef<EpubViewerHandle>(null);

  const { setPageInsight, getCachedInsight } = useCacheStore();
  const { setBook, getLocationForBook } = useBookStore();

  const lastProcessedKey = useRef("");

  const handleImportEpub = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/epub+zip",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const pickedAsset = result.assets[0];
        // The cache URI is a random UUID per import, so it can't be used as
        // a stable id for remembering reading position. The original
        // filename is stable across re-imports of the same file.
        const stableBookId = pickedAsset.name;

        if (pickedAsset.uri.startsWith("content://")) {
          // Now FileSystem.cacheDirectory resolves safely as a trailing-slash string!
          const cachePath = `${FileSystem.cacheDirectory}${pickedAsset.name}`;

          await FileSystem.copyAsync({
            from: pickedAsset.uri,
            to: cachePath,
          });
          setLocalBookUrl(cachePath);
        } else {
          setLocalBookUrl(pickedAsset.uri);
        }

        setBookId(stableBookId);
        setBook(stableBookId);
        setToc([]);
        lastProcessedKey.current = "";
      }
    } catch (error) {
      console.error("Error picking document asset:", error);
    }
  };

  const handleTextSelect = async (selectedText: string) => {
    setIsPanelOpen(true);
    setIsLoading(true);
    const data = await fetchPageInsights(
      `Context of extraction: "${selectedText}"`,
    );
    if (data) setActiveData(data);
    setIsLoading(false);
  };

  // cfi now comes directly from the WebView's PAGE_TURN message (sent
  // together with the page text from the same `relocated` event), instead
  // of being read separately from the Zustand store. Reading currentCfi
  // from the store here raced against the LOCATION_CHANGE message that
  // updates it -- both messages fire from the same epub.js event, but
  // there's no guarantee the store update commits before this handler
  // runs, which intermittently caused the dedup key to be computed against
  // a stale CFI and silently skip real page turns within the same chapter.
  const handlePageTurn = async (pageText: string, cfi: string | null) => {
    console.log("DEBUG [App]: Sending text to AI (first 50 chars):", pageText.substring(0, 50));
    const pageKey = `visibleTextV1_${bookId}_${cfi}`;

    // If this page is already being processed, discard the duplicate event.
    if (pageKey === lastProcessedKey.current) {
      console.log("TRACE: Debouncing duplicate PageTurn for key:", pageKey);
      return;
    }

    lastProcessedKey.current = pageKey;

    console.log("TRACE: handlePageTurn started for key:", pageKey);

    const cachedData = getCachedInsight(pageKey);
    if (cachedData) {
      console.log("TRACE: Cache Hit! Calling setActiveData with:", cachedData);
      setActiveData(cachedData);
      return;
    }

    console.log("TRACE: Cache Miss. Adding to groqQueue.");
    setIsLoading(true);

    groqQueue.add(async () => {
      const data = await fetchPageInsights(pageText);
      console.log("TRACE: Groq fetch complete. Result:", !!data);

      if (data) {
        setPageInsight(pageKey, data);
        console.log("TRACE: Updating State with new data");
        setActiveData(data);
      }
      setIsLoading(false);
    });
  };

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <StatusBar barStyle="dark-content" />
          <ApiKeyModal />

          <View style={styles.workspace}>
            {localBookUrl && bookId ? (
              <>
                <TocPanel
                  isOpen={isTocOpen}
                  onToggle={() => {
                    setIsTocOpen(!isTocOpen);
                    if (!isTocOpen) setIsPanelOpen(false);
                  }}
                  toc={toc}
                  onSelect={(href) => {
                    epubViewerRef.current?.navigateToHref(href);
                    setIsTocOpen(false);
                  }}
                  onCloseBook={() => {
                    setLocalBookUrl(null);
                    setBookId(null);
                    setToc([]);
                    setActiveData(null);
                    setIsPanelOpen(false);
                    setIsTocOpen(false);
                  }}
                />

                <EpubViewer
                  ref={epubViewerRef}
                  bookUrl={localBookUrl}
                  bookId={bookId}
                  savedCfi={getLocationForBook(bookId)}
                  onPageTurn={handlePageTurn}
                  onTextSelect={handleTextSelect}
                  onTocLoaded={setToc}
                />

                <CompanionPanel
                  isOpen={isPanelOpen}
                  onClose={() => {
                    setIsPanelOpen(!isPanelOpen);
                    if (!isPanelOpen) setIsTocOpen(false); // Closes top shelf if opening bottom shelf
                  }}
                  isLoading={isLoading}
                  data={activeData}
                />
              </>
            ) : (
              <View style={styles.uploadState}>
                <Text style={styles.uploadTitle}>No EPUB Book Active</Text>
                <Text style={styles.uploadSub}>
                  Import an un-DRMed .epub file to start reading.
                </Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleImportEpub}
                >
                  <Text style={styles.uploadButtonText}>Import EPUB File</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  workspace: { flex: 1, position: "relative" },
  uploadState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 8,
  },
  uploadSub: {
    fontSize: 14,
    color: "#868E96",
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 360,
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadButtonText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
});