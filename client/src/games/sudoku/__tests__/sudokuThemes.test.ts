import { describe, expect, it } from "vitest";
import { SUDOKU_THEMES, THEME_CYCLE, isLightTheme } from "../sudokuThemes";
import { sudokuAudio } from "../sudokuAudio";

describe("Sudoku Immersive Gaming Themes", () => {
  it("defines the 3 master unique themes in THEME_CYCLE", () => {
    expect(THEME_CYCLE).toEqual(["chronicle", "cyber", "arcade"]);
  });

  it("configures The Daily Chronicle with serif typography, vintage masthead, and marimba audio", () => {
    const theme = SUDOKU_THEMES.chronicle;
    expect(theme.name).toBe("The Daily Chronicle");
    expect(theme.fontFamily).toBe("font-serif");
    expect(theme.soundProfile).toBe("marimba");
    expect(theme.masthead.title).toContain("DAILY CHRONICLE");
    expect(isLightTheme("chronicle")).toBe(true);
  });

  it("configures Cyber-Matrix HUD with monospace typography, telemetry masthead, and cyber audio", () => {
    const theme = SUDOKU_THEMES.cyber;
    expect(theme.name).toBe("Cyber-Matrix HUD");
    expect(theme.fontFamily).toBe("font-mono");
    expect(theme.soundProfile).toBe("cyber");
    expect(theme.masthead.title).toContain("QUANTUM MATRIX");
    expect(isLightTheme("cyber")).toBe(false);
  });

  it("configures Retro Arcade 1984 with arcade typography, coin-op marquee masthead, and chiptune audio", () => {
    const theme = SUDOKU_THEMES.arcade;
    expect(theme.name).toBe("Retro Arcade 1984");
    expect(theme.fontFamily).toBe("font-sans");
    expect(theme.soundProfile).toBe("arcade");
    expect(theme.masthead.title).toContain("1UP HIGH SCORE");
    expect(isLightTheme("arcade")).toBe(false);
  });

  it("supports sound profile switching on the procedural audio synthesizer", () => {
    expect(() => {
      sudokuAudio.setSoundProfile("marimba");
      sudokuAudio.setSoundProfile("cyber");
      sudokuAudio.setSoundProfile("arcade");
    }).not.toThrow();
  });
});
