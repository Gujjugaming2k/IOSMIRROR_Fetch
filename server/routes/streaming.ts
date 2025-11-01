import { RequestHandler } from "express";

export interface StreamingDetail {
  id: string;
  service: "netflix" | "amazon-prime" | "jio-hotstar";
  seriesName: string;
  seriesId: string;
  season: {
    number: string;
    id: string;
  };
  episodes: Array<{
    id: string;
    title: string;
    episode: string;
    streamUrl: string;
  }>;
  savedAt: string;
  folderPath: string;
}

// Generate folder path based on service and series
const generateFolderPath = (
  service: string,
  seriesName: string,
  seasonNumber: string,
): string => {
  const cleanSeriesName = seriesName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
  return `FetchOTT/${service}/${cleanSeriesName}/Season_${seasonNumber}`;
};

// Generate .strm file content
const generateStrmContent = (episode: any): string => {
  const episodeId = episode.id;
  return `https://iosmirror.vflix.life/api/stream-proxy?url=https://net51.cc/hls/${episodeId}.m3u8?in=1df163a49286a7c854f2b07e8a995bfa::913b431120b4fd2ec3d4bfd587867697::1761993038::ni&referer=https%3A%2F%2Fnet51.cc`;
};

export const handleSaveStreaming: RequestHandler = async (req, res) => {
  try {
    const { service, seriesName, seriesId, season, episodes } = req.body;

    if (!service || !seriesName || !seriesId || !season || !episodes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const folderPath = generateFolderPath(service, seriesName, season.number);

    // Generate .strm file mapping
    const strmFiles = episodes.map((episode: any, index: number) => {
      const episodeNumber = episode.episode.split("E")[1] || `${index + 1}`;
      const fileName = `E${episodeNumber}.strm`;
      const content = generateStrmContent(episode);
      return {
        fileName,
        path: `${folderPath}/${fileName}`,
        content,
      };
    });

    const streamingDetail: StreamingDetail = {
      id: `${service}_${seriesId}_s${season.number}_${Date.now()}`,
      service: service as any,
      seriesName,
      seriesId,
      season,
      episodes: episodes.map((ep: any) => ({
        id: ep.id,
        title: ep.title,
        episode: ep.episode,
        streamUrl: generateStrmContent(ep),
      })),
      savedAt: new Date().toISOString(),
      folderPath,
    };

    res.json({
      success: true,
      streamingDetail,
      strmFiles,
    });
  } catch (error) {
    console.error("Streaming save error:", error);
    res.status(500).json({ error: "Failed to save streaming details" });
  }
};

// Export streaming files as downloadable content
export const handleExportStreaming: RequestHandler = async (req, res) => {
  try {
    const { id, strmFiles } = req.body;

    if (!strmFiles || strmFiles.length === 0) {
      return res.status(400).json({ error: "No files to export" });
    }

    // Create a simple text representation of the folder structure
    let content = "# Streaming Files Export\n\n";
    content += "## Folder Structure:\n";
    content += "```\n";

    const folderStructure: { [key: string]: string[] } = {};
    strmFiles.forEach((file: any) => {
      const dir = file.path.substring(0, file.path.lastIndexOf("/"));
      if (!folderStructure[dir]) {
        folderStructure[dir] = [];
      }
      folderStructure[dir].push(file.fileName);
    });

    Object.entries(folderStructure).forEach(([dir, files]) => {
      content += `${dir}/\n`;
      files.forEach((file) => {
        content += `  └─ ${file}\n`;
      });
    });

    content += "```\n\n";
    content += "## Files Content:\n\n";

    strmFiles.forEach((file: any) => {
      content += `### ${file.path}\n`;
      content += "```\n";
      content += file.content + "\n";
      content += "```\n\n";
    });

    res.setHeader("Content-Type", "text/plain");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="streaming-${id}.txt"`,
    );
    res.send(content);
  } catch (error) {
    console.error("Streaming export error:", error);
    res.status(500).json({ error: "Failed to export streaming details" });
  }
};

export const handleDeleteStreaming: RequestHandler = async (req, res) => {
  try {
    // In a real scenario, this would delete the actual files from the server
    // For now, we just return success as the client deletes from localStorage
    res.json({ success: true, message: "Streaming details deleted" });
  } catch (error) {
    console.error("Streaming delete error:", error);
    res.status(500).json({ error: "Failed to delete streaming details" });
  }
};
