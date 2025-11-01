import { RequestHandler } from "express";
import * as fs from "fs";
import * as path from "path";

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
  const cleanSeriesName = seriesName.trim();
  return path.join(
    process.cwd(),
    `OTT/${service}/Series/${cleanSeriesName}/Season ${seasonNumber}`,
  );
};

// Generate .strm file content
const generateStrmContent = (
  episode: any,
  primeToken?: string | null,
): string => {
  const episodeId = episode.id;
  // Use provided prime token or fall back to hardcoded token
  const token =
    primeToken ||
    "in=1df163a49286a7c854f2b07e8a995bfa::913b431120b4fd2ec3d4bfd587867697::1761993038::ni";
  return `https://iosmirror.vflix.life/api/stream-proxy?url=https://net51.cc/hls/${episodeId}.m3u8?${token}&referer=https%3A%2F%2Fnet51.cc`;
};

// Ensure directory exists (create if not)
const ensureDirectoryExists = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Write .strm files to disk
const writeStrmFiles = (
  folderPath: string,
  episodes: any[],
  primeToken?: string | null,
): Array<{ fileName: string; filePath: string; streamUrl: string }> => {
  ensureDirectoryExists(folderPath);

  return episodes.map((episode, index) => {
    const episodeNumber = episode.episode.split("E")[1] || `${index + 1}`;
    const fileName = `E${episodeNumber}.strm`;
    const filePath = path.join(folderPath, fileName);
    const content = generateStrmContent(episode, primeToken);

    fs.writeFileSync(filePath, content, "utf-8");

    return {
      fileName,
      filePath,
      streamUrl: content,
    };
  });
};

export const handleSaveStreaming: RequestHandler = async (req, res) => {
  try {
    const { service, seriesName, seriesId, season, episodes, primeToken } =
      req.body;

    if (!service || !seriesName || !seriesId || !season || !episodes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const folderPath = generateFolderPath(service, seriesName, season.number);

    // Generate .strm file mapping
    const strmFiles = episodes.map((episode: any, index: number) => {
      const episodeNumber = episode.episode.split("E")[1] || `${index + 1}`;
      const fileName = `E${episodeNumber}.strm`;
      const content = generateStrmContent(episode, primeToken);
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
        streamUrl: generateStrmContent(ep, primeToken),
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

// Generate movie .strm file
export const handleGenerateMovie: RequestHandler = async (req, res) => {
  try {
    const { service, movieName, movieId, primeToken } = req.body;

    if (!service || !movieName || !movieId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const moviesFolder = path.join(process.cwd(), `OTT/${service}/Movies`);

    try {
      ensureDirectoryExists(moviesFolder);

      const fileName = `${movieId}.strm`;
      const filePath = path.join(moviesFolder, fileName);
      const streamUrl = generateStrmContent({ id: movieId }, primeToken);

      fs.writeFileSync(filePath, streamUrl, "utf-8");

      const response = {
        success: true,
        movieName,
        movieId,
        folderPath: moviesFolder,
        file: {
          fileName,
          filePath,
          streamUrl,
        },
        generatedAt: new Date().toISOString(),
      };

      console.log(
        `Created movie .strm file ${fileName} for ${movieName} at ${moviesFolder}`,
      );

      res.json(response);
    } catch (error) {
      console.error(`Error writing movie file:`, error);
      return res.status(500).json({
        error: "Failed to write movie file",
      });
    }
  } catch (error) {
    console.error("Generate movie error:", error);
    res.status(500).json({ error: "Failed to generate movie file" });
  }
};

// Generate and save .strm files
export const handleGenerateStrm: RequestHandler = async (req, res) => {
  try {
    const { service, seriesName, seriesId, seasons, primeToken } = req.body;

    if (!service || !seriesName || !seriesId || !seasons) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const allFiles: any[] = [];
    const seasonDetails: any[] = [];

    // Process each season
    for (const season of seasons) {
      if (!season.episodes || season.episodes.length === 0) {
        continue;
      }

      const folderPath = generateFolderPath(service, seriesName, season.number);

      try {
        const createdFiles = writeStrmFiles(
          folderPath,
          season.episodes,
          primeToken,
        );

        allFiles.push(...createdFiles);

        seasonDetails.push({
          seasonNumber: season.number,
          totalEpisodes: season.episodes.length,
          folderPath,
          files: createdFiles,
        });

        console.log(
          `Created ${createdFiles.length} .strm files for ${seriesName} Season ${season.number} at ${folderPath}`,
        );
      } catch (error) {
        console.error(
          `Error writing files for season ${season.number}:`,
          error,
        );
        return res.status(500).json({
          error: `Failed to write files for season ${season.number}`,
        });
      }
    }

    const response = {
      success: true,
      seriesName,
      seriesId,
      totalSeasonsProcessed: seasonDetails.length,
      totalFilesCreated: allFiles.length,
      seasons: seasonDetails,
      generatedAt: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error("Generate .strm error:", error);
    res.status(500).json({ error: "Failed to generate .strm files" });
  }
};
