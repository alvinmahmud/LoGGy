import { Request, Response } from "express";
import {
  CatalogConfigurationError,
  CatalogProviderError,
  CatalogType,
  searchCatalog,
} from "../services/catalogService";

const catalogTypes = new Set<CatalogType>(["game", "movie", "tv"]);

export async function searchCatalogController(req: Request, res: Response) {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const type = typeof req.query.type === "string" ? req.query.type : "";

  if (query.length < 2 || query.length > 100) {
    res
      .status(400)
      .json({ message: "Search must be between 2 and 100 characters" });

    return;
  }
  if (!catalogTypes.has(type as CatalogType)) {
    res.status(400).json({ message: "Media type is invalid" });

    return;
  }

  try {
    const results = await searchCatalog(query, type as CatalogType);
    res.json({ results });
  } catch (error) {
    if (error instanceof CatalogConfigurationError) {
      res.status(503).json({ message: error.message });

      return;
    }
    if (error instanceof CatalogProviderError) {
      res
        .status(502)
        .json({ message: "Title search is temporarily unavailable" });

      return;
    }
    res.status(500).json({ message: "Title search could not be completed" });
  }
}
