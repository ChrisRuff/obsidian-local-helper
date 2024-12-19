import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl, getBlobArrayBuffer } from 'obsidian';
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

interface LocalHelperPluginSettings {
	ollama_url: string,
	text_generation_endpoint: string,
	text_generation_model: string,

	whisperx_executable: string,
	whisperx_model: string,
}

const DEFAULT_SETTINGS: LocalHelperPluginSettings = {
	ollama_url: "http://localhost:11434",
	text_generation_endpoint: '/api/generate',
	text_generation_model: 'mistral',

	whisperx_executable: 'whisperx',
	whisperx_model: 'small',
}
export const randomString = (length: number) => Array(length + 1).join((Math.random().toString(36) + '00000000000000000').slice(2, 18)).slice(0, length)

export const transcribe = async (file: string, settings: LocalHelperPluginSettings) => {
	return new Promise((resolve, reject) => {
		let command = `${settings.whisperx_executable}  --model ${settings.whisperx_model} --diarize --language en -f json -o /tmp/ ${file}`;
		exec(command, 
			{ cwd: path.join(settings.whisperx_executable, '..'), },
			async (error: any, stdout: any, stderr: any) => {
				console.log(stdout);
				console.log(stderr);

				if (error) {
					reject("Could not transcribe file");
					return;
				}
				try {
					let json_file = file.replace(file.split(".").pop()!, "json");
					json_file = `/tmp/${json_file.split("/").pop()}`;
					if(!fs.existsSync(json_file))
					{
						reject("Missing JSON file");
					}

					const json_data = JSON.parse(fs.readFileSync(json_file, 'utf8'));
					let text = ""
					json_data.segments.forEach((segment: any) => {
						text += "\\[" + segment.start + "s\\] " + segment.text + "\n";
					});
					resolve(text);
				}
				catch (error) {
					reject("Could not transcribe file");
				}
			});
		});
};
export const summerize = async (text: string, settings: LocalHelperPluginSettings) => {
	const url = settings.ollama_url + settings.text_generation_endpoint;
	const model = settings.text_generation_model;

	const payload = {
		model: model,
		system: "You are an assistant that is able to read a transcript of a meeting and summarize it. Your summary will be 10 sentences or less.",
		stream: false,
		keep_alive: "5s",
		prompt: text,
	}
	const request = {
		method: 'POST',
		url: url,
		contentType: 'application/json',
		body: JSON.stringify(payload),
		timeout: 20000,
	}
	console.log(request);
	const response = await requestUrl(request);
	console.log(response);

	const data = response.json;
	const summary = data.response;
	return summary;
}


export default class LocalHelperPlugin extends Plugin {
	settings: LocalHelperPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'transcribe-selected',
			name: 'Transcribe Selected',
			editorCallback: async (editor, view) => {
				const selection = editor.getSelection();
				const match = selection.match(/!\[\[(.*?)\]\]/);
				if (match) {
					const filename = match[1];
					console.log(filename);

					//const file = this.app.vault.getFiles().find(f=> f.name === filename)
					//@ts-ignore
					const file = this.app.vault.adapter.basePath + "/" + this.app.vault.getFiles().find(f=> f.name === filename)?.path
					if(file)
					{
						const cursor_start = editor.getCursor('from');
						const cursor_end = editor.getCursor('to');
						const selection = editor.getSelection();

						transcribe(file, this.settings).then((text) => {
							editor.replaceRange(selection + "\n" + text, cursor_start, cursor_end);
						}).catch((error) => {
							new Notice(error);
						});

					}
				}
			}

		});
		this.addCommand({
			id: 'summerize-selected',
			name: 'Summerize Selected',
			editorCallback: async (editor, view) => {
				const cursor_start = editor.getCursor('from');
				const cursor_end = editor.getCursor('to');
				const selection = editor.getSelection();

				summerize(selection, this.settings).then((text) => {
					editor.replaceRange(selection + "\n" + text, cursor_start, cursor_end);
				}).catch((error) => {
					new Notice(error);
				});
			}
		});
		this.addCommand({
			id: 'process-selected',
			name: 'Transcribe & Summerize Selected',
			editorCallback: async (editor, view) => {
				const selection = editor.getSelection();
				const match = selection.match(/!\[\[(.*?)\]\]/);
				if (match) {
					const filename = match[1];
					console.log(filename);

					//@ts-ignore
					const file = this.app.vault.adapter.basePath + "/" + this.app.vault.getFiles().find(f=> f.name === filename)?.path
					if(file)
					{
						const cursor_start = editor.getCursor('from');
						const cursor_end = editor.getCursor('to');
						const selection = editor.getSelection();

						transcribe(file, this.settings).then((transcribed_text : string) => {
							summerize(transcribed_text, this.settings).then((summary_text : string) => {
								editor.replaceRange(selection + "\n" + transcribed_text + "\n" + summary_text, cursor_start, cursor_end);
							}).catch((error) => {
								new Notice(error);
							});
						}).catch((error) => {
							new Notice(error);
						});
					}
				}
			}
		});

		/*
		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
		*/

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LocalHelperSettingTab(this.app, this));

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

/*
class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
*/

class LocalHelperSettingTab extends PluginSettingTab {
	plugin: LocalHelperPlugin;

	constructor(app: App, plugin: LocalHelperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		new Setting(containerEl)
			.setName('Ollama URL')
			.setDesc('Enter the url of your Ollama instance')
			.addText(text => text
				.setPlaceholder('http://localhost:11434')
				.setValue(this.plugin.settings.ollama_url)
				.onChange(async (value) => {
					this.plugin.settings.ollama_url = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Text Generation Endpoint')
			.setDesc('Endpoint for text generation requests')
			.addText(text => text
				.setValue(this.plugin.settings.text_generation_endpoint)
				.setPlaceholder('/v1/chat/completions')
				.onChange(async (value) => {
					this.plugin.settings.text_generation_endpoint = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Text Generation Model')
			.setDesc('Select the model to use for text generation')
			.addText(text => text
				.setPlaceholder('mistral')
				.setValue(this.plugin.settings.text_generation_model)
				.onChange(async (value) => {
					this.plugin.settings.text_generation_model = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('WhisperX Executable')
			.setDesc('Enter the path to the WhisperX executable')
			.addText(text => text
				.setPlaceholder('whisperx')
				.setValue(this.plugin.settings.whisperx_executable)
				.onChange(async (value) => {
					this.plugin.settings.whisperx_executable = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('WhisperX Model')
			.setDesc('Select the model to use for WhisperX')
			.addDropdown(dropdown => {
				dropdown.addOption('tiny', 'tiny');
				dropdown.addOption('small', 'small');
				dropdown.addOption('medium', 'medium');
				dropdown.addOption('large', 'large');
				dropdown.addOption('large-v2', 'large-v2');
				dropdown.setValue(this.plugin.settings.whisperx_model);
				dropdown.onChange(async (value) => {
					this.plugin.settings.whisperx_model = value;
					await this.plugin.saveSettings();
				});
			});

	}
}
