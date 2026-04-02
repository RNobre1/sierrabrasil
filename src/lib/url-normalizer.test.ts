import { describe, it, expect } from "vitest";
import { normalizeSocialUrl, extractPlatformSlug } from "./url-normalizer";

describe("normalizeSocialUrl", () => {
  describe("instagram", () => {
    it("normalizes @username", () => {
      expect(normalizeSocialUrl("instagram", "@meteora_digital")).toBe("https://www.instagram.com/meteora_digital/");
    });

    it("normalizes plain username", () => {
      expect(normalizeSocialUrl("instagram", "meteora_digital")).toBe("https://www.instagram.com/meteora_digital/");
    });

    it("normalizes full URL", () => {
      expect(normalizeSocialUrl("instagram", "https://www.instagram.com/meteora_digital")).toBe("https://www.instagram.com/meteora_digital/");
    });

    it("normalizes URL without www", () => {
      expect(normalizeSocialUrl("instagram", "https://instagram.com/meteora_digital/")).toBe("https://www.instagram.com/meteora_digital/");
    });

    it("normalizes URL without protocol", () => {
      expect(normalizeSocialUrl("instagram", "instagram.com/meteora_digital")).toBe("https://www.instagram.com/meteora_digital/");
    });

    it("normalizes URL with trailing params", () => {
      expect(normalizeSocialUrl("instagram", "https://www.instagram.com/meteora_digital/?hl=pt-br")).toBe("https://www.instagram.com/meteora_digital/");
    });

    it("strips multiple @ symbols", () => {
      expect(normalizeSocialUrl("instagram", "@@meteora")).toBe("https://www.instagram.com/meteora/");
    });

    it("handles whitespace", () => {
      expect(normalizeSocialUrl("instagram", "  @meteora_digital  ")).toBe("https://www.instagram.com/meteora_digital/");
    });
  });

  describe("facebook", () => {
    it("normalizes page name", () => {
      expect(normalizeSocialUrl("facebook", "MeteoraDig")).toBe("https://www.facebook.com/MeteoraDig/");
    });

    it("normalizes full URL", () => {
      expect(normalizeSocialUrl("facebook", "https://www.facebook.com/MeteoraDig")).toBe("https://www.facebook.com/MeteoraDig/");
    });

    it("normalizes fb.com URL", () => {
      expect(normalizeSocialUrl("facebook", "https://fb.com/MeteoraDig")).toBe("https://www.facebook.com/MeteoraDig/");
    });

    it("normalizes URL without protocol", () => {
      expect(normalizeSocialUrl("facebook", "facebook.com/MeteoraDig")).toBe("https://www.facebook.com/MeteoraDig/");
    });

    it("preserves profile.php URLs", () => {
      expect(normalizeSocialUrl("facebook", "https://www.facebook.com/profile.php?id=123456")).toBe("https://www.facebook.com/profile.php?id=123456");
    });

    it("normalizes URL with query params (non profile.php)", () => {
      expect(normalizeSocialUrl("facebook", "https://facebook.com/MeteoraDig?ref=page")).toBe("https://www.facebook.com/MeteoraDig/");
    });

    it("handles @page-name", () => {
      expect(normalizeSocialUrl("facebook", "@MeteoraDig")).toBe("https://www.facebook.com/MeteoraDig/");
    });
  });

  describe("linkedin", () => {
    it("normalizes company slug", () => {
      expect(normalizeSocialUrl("linkedin", "meteora-digital")).toBe("https://www.linkedin.com/company/meteora-digital/");
    });

    it("normalizes full company URL", () => {
      expect(normalizeSocialUrl("linkedin", "https://www.linkedin.com/company/meteora-digital")).toBe("https://www.linkedin.com/company/meteora-digital/");
    });

    it("normalizes personal profile URL (/in/)", () => {
      expect(normalizeSocialUrl("linkedin", "https://www.linkedin.com/in/rafael-nobre")).toBe("https://www.linkedin.com/in/rafael-nobre/");
    });

    it("normalizes URL without protocol", () => {
      expect(normalizeSocialUrl("linkedin", "linkedin.com/company/meteora-digital")).toBe("https://www.linkedin.com/company/meteora-digital/");
    });

    it("normalizes partial URL with /company/", () => {
      expect(normalizeSocialUrl("linkedin", "linkedin.com/company/meteora-digital/")).toBe("https://www.linkedin.com/company/meteora-digital/");
    });

    it("normalizes partial URL with /in/", () => {
      expect(normalizeSocialUrl("linkedin", "linkedin.com/in/rafael-nobre")).toBe("https://www.linkedin.com/in/rafael-nobre/");
    });

    it("strips query params and trailing paths", () => {
      expect(normalizeSocialUrl("linkedin", "https://www.linkedin.com/company/meteora-digital/about/?viewAsMember=true")).toBe("https://www.linkedin.com/company/meteora-digital/");
    });

    it("handles whitespace", () => {
      expect(normalizeSocialUrl("linkedin", "  meteora-digital  ")).toBe("https://www.linkedin.com/company/meteora-digital/");
    });
  });

  describe("tiktok", () => {
    it("normalizes @username", () => {
      expect(normalizeSocialUrl("tiktok", "@meteora_digital")).toBe("https://www.tiktok.com/@meteora_digital");
    });

    it("normalizes plain username (adds @)", () => {
      expect(normalizeSocialUrl("tiktok", "meteora_digital")).toBe("https://www.tiktok.com/@meteora_digital");
    });

    it("normalizes full URL", () => {
      expect(normalizeSocialUrl("tiktok", "https://www.tiktok.com/@meteora_digital")).toBe("https://www.tiktok.com/@meteora_digital");
    });

    it("normalizes URL without protocol", () => {
      expect(normalizeSocialUrl("tiktok", "tiktok.com/@meteora_digital")).toBe("https://www.tiktok.com/@meteora_digital");
    });

    it("handles whitespace", () => {
      expect(normalizeSocialUrl("tiktok", "  @meteora  ")).toBe("https://www.tiktok.com/@meteora");
    });
  });

  describe("youtube", () => {
    it("normalizes @channel", () => {
      expect(normalizeSocialUrl("youtube", "@MeteoraDig")).toBe("https://www.youtube.com/@MeteoraDig");
    });

    it("normalizes plain channel name (adds @)", () => {
      expect(normalizeSocialUrl("youtube", "MeteoraDig")).toBe("https://www.youtube.com/@MeteoraDig");
    });

    it("normalizes full @ URL", () => {
      expect(normalizeSocialUrl("youtube", "https://www.youtube.com/@MeteoraDig")).toBe("https://www.youtube.com/@MeteoraDig");
    });

    it("preserves /channel/UCXXX URL", () => {
      expect(normalizeSocialUrl("youtube", "https://www.youtube.com/channel/UCabc123")).toBe("https://www.youtube.com/channel/UCabc123");
    });

    it("preserves /c/channel URL", () => {
      expect(normalizeSocialUrl("youtube", "https://www.youtube.com/c/MeteoraDig")).toBe("https://www.youtube.com/c/MeteoraDig");
    });

    it("normalizes URL without protocol", () => {
      expect(normalizeSocialUrl("youtube", "youtube.com/@MeteoraDig")).toBe("https://www.youtube.com/@MeteoraDig");
    });

    it("normalizes youtu.be URL (pass through)", () => {
      expect(normalizeSocialUrl("youtube", "https://youtu.be/abc123")).toBe("https://youtu.be/abc123");
    });
  });

  describe("website", () => {
    it("adds https to plain domain", () => {
      expect(normalizeSocialUrl("website", "meusite.com.br")).toBe("https://meusite.com.br");
    });

    it("adds https to www domain", () => {
      expect(normalizeSocialUrl("website", "www.meusite.com.br")).toBe("https://www.meusite.com.br");
    });

    it("keeps full URL as-is", () => {
      expect(normalizeSocialUrl("website", "https://meusite.com.br")).toBe("https://meusite.com.br");
    });

    it("upgrades http to https", () => {
      expect(normalizeSocialUrl("website", "http://meusite.com.br")).toBe("https://meusite.com.br");
    });

    it("handles whitespace", () => {
      expect(normalizeSocialUrl("website", "  meusite.com.br  ")).toBe("https://meusite.com.br");
    });
  });
});

describe("extractPlatformSlug", () => {
  it("extracts Instagram username from URL", () => {
    expect(extractPlatformSlug("instagram", "https://www.instagram.com/meteora_digital/")).toBe("meteora_digital");
  });

  it("extracts Facebook page from URL", () => {
    expect(extractPlatformSlug("facebook", "https://www.facebook.com/MeteoraDig/")).toBe("MeteoraDig");
  });

  it("extracts LinkedIn company from URL", () => {
    expect(extractPlatformSlug("linkedin", "https://www.linkedin.com/company/meteora-digital/")).toBe("meteora-digital");
  });

  it("extracts LinkedIn person from URL", () => {
    expect(extractPlatformSlug("linkedin", "https://www.linkedin.com/in/rafael-nobre/")).toBe("rafael-nobre");
  });

  it("extracts TikTok username from URL", () => {
    expect(extractPlatformSlug("tiktok", "https://www.tiktok.com/@meteora")).toBe("@meteora");
  });

  it("extracts YouTube handle from URL", () => {
    expect(extractPlatformSlug("youtube", "https://www.youtube.com/@MeteoraDig")).toBe("@MeteoraDig");
  });

  it("returns the input for plain usernames", () => {
    expect(extractPlatformSlug("instagram", "@meteora")).toBe("@meteora");
  });
});
