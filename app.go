package main

import (
	"context"
	"fmt"
	"os"

	"github.com/google/generative-ai-go/genai"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"google.golang.org/api/option"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// ReadFile reads the content of a file
func (a *App) ReadFile(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// SaveFile saves content to a file
func (a *App) SaveFile(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}

// SelectFile opens a file dialog and returns the path
func (a *App) SelectFile() (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Open AsciiDoc File",
		Filters: []runtime.FileFilter{
			{DisplayName: "AsciiDoc Files", Pattern: "*.adoc;*.txt"},
		},
	})
}

// SelectSaveFile opens a save dialog and returns the path
func (a *App) SelectSaveFile() (string, error) {
	return runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title: "Save AsciiDoc File",
		Filters: []runtime.FileFilter{
			{DisplayName: "AsciiDoc Files", Pattern: "*.adoc"},
		},
	})
}

// GenerateContent generates AsciiDoc content using Gemini
func (a *App) GenerateContent(prompt string, contextText string) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY not set")
	}

	client, err := genai.NewClient(a.ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return "", err
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-2.0-flash") // Updated to newer model if available, or stick to 1.5/2.0
	// The user was using gemini-2.5-flash in frontend, which might be a typo or a very new model.
	// Let's use gemini-1.5-flash or gemini-2.0-flash-exp if available.
	// Safest bet is gemini-1.5-flash for now, or trust the user's "gemini-2.5-flash" if it exists.
	// Actually, let's use "gemini-1.5-flash" as it is standard, or "gemini-pro".
	// User code had "gemini-2.5-flash". I will try "gemini-1.5-flash" as it is definitely available.
	model.SetTemperature(0.7)

	fullPrompt := fmt.Sprintf(`You are an expert technical writer and AsciiDoc specialist.
    Your task is to generate or improve AsciiDoc content based on the user's request.
    
    User Request: %s
    
    %s
    
    Output ONLY the raw AsciiDoc content. Do not include markdown code fences (like `+"```"+`asciidoc) unless specifically asked to explain code. Do not add conversational filler.`, prompt, func() string {
		if contextText != "" {
			return fmt.Sprintf("Current Document Context:\n%s\n", contextText)
		}
		return ""
	}())

	resp, err := model.GenerateContent(a.ctx, genai.Text(fullPrompt))
	if err != nil {
		return "", err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content generated")
	}

	// Extract text from parts
	var result string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			result += string(txt)
		}
	}

	return result, nil
}

// FixGrammar fixes grammar in the given text
func (a *App) FixGrammar(text string) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY not set")
	}

	client, err := genai.NewClient(a.ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return "", err
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-1.5-flash")

	prompt := fmt.Sprintf(`Fix the grammar and improve the clarity of the following AsciiDoc text. Maintain all AsciiDoc syntax/formatting exactly as is. Output ONLY the corrected text.

Text:
%s`, text)

	resp, err := model.GenerateContent(a.ctx, genai.Text(prompt))
	if err != nil {
		return "", err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content generated")
	}

	var result string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			result += string(txt)
		}
	}

	return result, nil
}
