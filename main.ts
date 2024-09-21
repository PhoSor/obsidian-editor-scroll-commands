import { Platform, App, MarkdownFileInfo, Hotkey, Plugin, PluginSettingTab, Setting } from 'obsidian';

const PluginId = 'editor-scroll-commands';
const ScrollUpCommandId = 'scroll-up';
const ScrollDownCommandId = 'scroll-down';

interface EditorScrollCommandsSettings {
  offset: number;
  interval: number;
}

const DEFAULT_SETTINGS: EditorScrollCommandsSettings = {
  offset: 11,
  interval: 8,
}

const ModToEventProp = {
  'Alt': 'altKey',
  'Shift': 'shiftKey',
  'Ctrl': 'ctrlKey',
  'Meta': 'metaKey',
  'Mod': Platform.isMacOS ? 'metaKey' : 'ctrlKey',
};

export default class EditorScrollCommandsPlugin extends Plugin {
  settings: EditorScrollCommandsSettings;
  intervalId: number;
  editorScrolling: MarkdownFileInfo | null;

  clearInterval() {
    window.clearInterval(this.intervalId);
    this.intervalId = 0;
    this.editorScrolling = null;
  }

  scroll(offset: number) {
    let editor = this.app.workspace.activeEditor?.editor;
    if (!editor) { return; }

    if (!this.intervalId) {
      this.editorScrolling = this.app.workspace.activeEditor;
      this.intervalId = window.setInterval(() => {
        if (this.app.workspace.activeEditor != this.editorScrolling) {
          this.clearInterval();
          return;
        }
        // @ts-expect-error
        editor?.cm.scrollDOM.scrollBy(0, offset);
      }, this.settings.interval);
      this.registerInterval(this.intervalId);
    }
  }

  scrollUp() {
    this.scroll(-this.settings.offset);
  }

  scrollDown() {
    this.scroll(this.settings.offset);
  }

  isScrollHotkeyEvent(event: KeyboardEvent, hotkeys: Hotkey[]) {
    return hotkeys.some((hotkey: Hotkey) => {
      let keyMatched =
        (hotkey.key == event.code) ||
        ('Key' + hotkey.key == event.code);

      let allModsMatched = hotkey.modifiers.every(m => {
        let propName = ModToEventProp[m];

        // @ts-expect-error
        if (!event[propName]) { return false; }

        return true;
      });

      return keyMatched && allModsMatched;
    });
  }

  isScrollUpHotkeyEvent(event: KeyboardEvent) {
    // @ts-expect-error
    let scrollUpHotkeys = this.app.hotkeyManager.customKeys[`${PluginId}:${ScrollUpCommandId}`];

    if (!scrollUpHotkeys) { return false; }

    return this.isScrollHotkeyEvent(event, scrollUpHotkeys);
  }

  isScrollDownHotkeyEvent(event: KeyboardEvent) {
    // @ts-expect-error
    let scrollDownHotkeys = this.app.hotkeyManager.customKeys[`${PluginId}:${ScrollDownCommandId}`];

    if (!scrollDownHotkeys) { return false; }

    return this.isScrollHotkeyEvent(event, scrollDownHotkeys);
  }

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: ScrollUpCommandId,
      name: 'Scroll up',
      editorCallback: () => {},
    });

    this.addCommand({
      id: ScrollDownCommandId,
      name: 'Scroll down',
      editorCallback: () => {},
    });

    this.registerDomEvent(window, 'keydown', (ev: KeyboardEvent) => {
      let scrollUpHotkeyPressed = this.isScrollUpHotkeyEvent(ev);
      let scrollDownHotkeyPressed = this.isScrollDownHotkeyEvent(ev);

      if (scrollUpHotkeyPressed) {
        ev.preventDefault();
        this.scrollUp();
      }

      if (scrollDownHotkeyPressed) {
        ev.preventDefault();
        this.scrollDown();
      }
    }, true);

    this.registerDomEvent(window, 'keyup', (ev: KeyboardEvent) => {
      let scrollUpHotkeyReleased = this.isScrollUpHotkeyEvent(ev);
      let scrollDownHotkeyReleased = this.isScrollDownHotkeyEvent(ev);

      if (scrollUpHotkeyReleased) {
        ev.preventDefault();
        this.clearInterval();
      }

      if (scrollDownHotkeyReleased) {
        ev.preventDefault();
        this.clearInterval();
      }
    }, true);

    this.addSettingTab(new EditorScrollCommandsSettingTab(this.app, this));
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

class EditorScrollCommandsSettingTab extends PluginSettingTab {
  plugin: EditorScrollCommandsPlugin;

  constructor(app: App, plugin: EditorScrollCommandsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;

    containerEl.empty();

    new Setting(containerEl)
    .setHeading()
    .setName('Editor Scroll Commands');

    new Setting(containerEl)
    .setName('Scroll offset')
    .setDesc('The number of pixels to scroll per interval, px')
    .addText(text => text
             .setPlaceholder('Enter the scroll offset number')
             .setValue(this.plugin.settings.offset?.toString())
             .onChange(async (value) => {
               this.plugin.settings.offset = value ?
                 parseInt(value, 10) : DEFAULT_SETTINGS.offset;
               await this.plugin.saveSettings();
             }));

    new Setting(containerEl)
    .setName('Scroll interval')
    .setDesc('The scroll offset interval in milliseconds, ms')
    .addText(text => text
             .setPlaceholder('Enter the interval amount')
             .setValue(this.plugin.settings.interval?.toString())
             .onChange(async (value) => {
               this.plugin.settings.interval = value ?
                 parseInt(value, 10) : DEFAULT_SETTINGS.interval;
               await this.plugin.saveSettings();
             }));
  }
}
