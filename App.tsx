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
      }
    } catch (error) {
      console.error("Error picking document asset:", error);
    }
  };
  
  // Keep your handlers (handleTextSelect, handlePageTurn) identical here...
  const handleTextSelect = async (selectedText: string) => {
    setIsPanelOpen(true);
    setIsLoading(true);
    const data = await fetchPageInsights(
      `Context of extraction: "${selectedText}"`,
    );
    if (data) setActiveData(data);
    setIsLoading(false);
  };

  const handlePageTurn = async (pageText: string) => {
    const pageKey = pageText.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_");
    const cachedData = getCachedInsight(pageKey);
    if (cachedData) {
      setActiveData(cachedData);
      return;
    }
    setIsLoading(true);
    groqQueue.add(async () => {
      const data = await fetchPageInsights(pageText);
      if (data) {
        setPageInsight(pageKey, data);
        setActiveData(data);
      }
      setIsLoading(false);
    });
  };

  const handleTocSelect = (href: string) => {
    epubViewerRef.current?.navigateToHref(href);
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
                <EpubViewer
                  ref={epubViewerRef}
                  bookUrl={localBookUrl}
                  bookId={bookId}
                  savedCfi={getLocationForBook(bookId)}
                  onPageTurn={handlePageTurn}
                  onTextSelect={handleTextSelect}
                  onTocLoaded={setToc}
                />
                <TocPanel
                  isOpen={isTocOpen}
                  onClose={() => setIsTocOpen(false)}
                  toc={toc}
                  onSelect={handleTocSelect}
                />
                <CompanionPanel
                  isOpen={isPanelOpen}
                  onClose={() => setIsPanelOpen(false)}
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
  workspace: { flex: 1, flexDirection: "row", position: "relative" },
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