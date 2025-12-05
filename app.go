package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

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

// SelectCssFile opens a file dialog for CSS files and returns the path
func (a *App) SelectCssFile() (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Open CSS File",
		Filters: []runtime.FileFilter{
			{DisplayName: "CSS Files", Pattern: "*.css"},
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

// SelectDirectory opens a directory dialog and returns the path
func (a *App) SelectDirectory() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Project Root",
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

	model := client.GenerativeModel("gemini-2.0-flash")
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

// FileNode represents a file or directory in the file system
type FileNode struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	IsDir    bool        `json:"isDir"`
	Children []*FileNode `json:"children,omitempty"`
}

// GetFileTree returns the file structure of the given directory
func (a *App) GetFileTree(dirPath string) ([]*FileNode, error) {
	if dirPath == "" {
		dirPath = "./content"
	}

	// Create content dir if it doesn't exist (legacy behavior)
	if dirPath == "./content" {
		if _, err := os.Stat(dirPath); os.IsNotExist(err) {
			_ = os.Mkdir(dirPath, 0755)
		}
	}

	return a.readDirRecursive(dirPath)
}

func (a *App) readDirRecursive(dirPath string) ([]*FileNode, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var nodes []*FileNode
	for _, entry := range entries {
		// Skip hidden files/dirs
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		path := filepath.Join(dirPath, entry.Name())
		node := &FileNode{
			Name:  entry.Name(),
			Path:  path,
			IsDir: entry.IsDir(),
		}

		if entry.IsDir() {
			children, err := a.readDirRecursive(path)
			if err == nil {
				node.Children = children
			}
			// Only add directories if they have content or just add them anyway?
			// User wants to traverse subfolders.
			nodes = append(nodes, node)
		} else {
			// Filter for .adoc files or just include all?
			// The previous logic filtered for .adoc. Let's keep that for files, but maybe allow others?
			// User said "FS navigation tree", usually implies all relevant files.
			// Let's stick to .adoc and maybe .txt for now as per previous filter,
			// but maybe we should be more permissive for a general tree.
			// Let's allow .adoc, .txt, .md, .json, .css for now.
			ext := strings.ToLower(filepath.Ext(entry.Name()))
			if ext == ".adoc" || ext == ".txt" || ext == ".md" || ext == ".css" {
				nodes = append(nodes, node)
			}
		}
	}
	return nodes, nil
}

// ListFiles lists .adoc files in the given directory (Flat list for backward compatibility or simple search)
func (a *App) ListFiles(dirPath string) ([]string, error) {
	if dirPath == "" {
		dirPath = "./content"
	}

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		if dirPath == "./content" && os.IsNotExist(err) {
			_ = os.Mkdir(dirPath, 0755)
			return []string{}, nil
		}
		return nil, err
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() {
			name := entry.Name()
			if len(name) > 5 && name[len(name)-5:] == ".adoc" {
				files = append(files, name)
			}
		}
	}
	return files, nil
}

// OpenGitHubDesktop attempts to open the repository at the given path in GitHub Desktop
func (a *App) OpenGitHubDesktop(path string) (bool, error) {
	// Check registry for x-github-client protocol
	cmd := exec.Command("reg", "query", "HKCR\\x-github-client")
	if err := cmd.Run(); err != nil {
		return false, nil
	}

	if path == "" {
		var err error
		path, err = os.Getwd()
		if err != nil {
			return true, err
		}
	}

	// Try to get remote URL first
	// We use 'git -C path' to run git in the target directory
	gitCmd := exec.Command("git", "-C", path, "config", "--get", "remote.origin.url")
	output, err := gitCmd.Output()

	var url string
	if err == nil && len(output) > 0 {
		// Use the remote URL
		remoteURL := strings.TrimSpace(string(output))
		url = "x-github-client://openRepo/" + remoteURL
	} else {
		// Fallback to local path
		url = "x-github-client://openRepo/" + path
	}

	runtime.BrowserOpenURL(a.ctx, url)

	return true, nil
}

// OpenBrowser opens a URL in the default browser
func (a *App) OpenBrowser(url string) {
	runtime.BrowserOpenURL(a.ctx, url)
}

// DB Methods

func (a *App) SavePreference(key string, value interface{}) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	return db.SetPreference(key, value)
}

func (a *App) GetPreference(key string) (interface{}, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return db.GetPreference(key)
}

func (a *App) GetAllPreferences() (map[string]interface{}, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return db.GetAllPreferences()
}

func (a *App) SaveAppState(key string, value string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	return db.SetAppState(key, value)
}

func (a *App) GetAppState(key string) (string, error) {
	if db == nil {
		return "", fmt.Errorf("database not initialized")
	}
	return db.GetAppState(key)
}

func (a *App) SaveShadowFile(path string, content string, isDirty bool) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	return db.SaveShadowFile(path, content, isDirty)
}

func (a *App) GetShadowFile(path string) (map[string]interface{}, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	content, isDirty, err := db.GetShadowFile(path)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"content": content,
		"isDirty": isDirty,
	}, nil
}

func (a *App) ClearShadowFile(path string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	return db.ClearShadowFile(path)
}

func (a *App) HasCorruption() (bool, error) {
	if db == nil {
		return false, fmt.Errorf("database not initialized")
	}
	return db.HasCorruption(), nil
}

func (a *App) RestoreBackup() error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	return db.RestoreBackup()
}

// Project Methods

func (a *App) AddProject(path string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	return db.AddProject(path)
}

func (a *App) GetProjects() ([]Project, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return db.GetProjects()
}

func (a *App) RemoveProject(path string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	return db.RemoveProject(path)
}

func (a *App) UpdateProjectLastOpened(path string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	return db.UpdateProjectLastOpened(path)
}

func (a *App) GetDefaultProjectRoot() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	return filepath.Join(cwd, "docsCraft"), nil
}
