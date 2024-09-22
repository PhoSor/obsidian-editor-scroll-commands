import { Platform, App, MarkdownFileInfo, Hotkey, Plugin, PluginSettingTab, Setting } from 'obsidian';

const PLUGIN_ID = 'editor-scroll-commands';
const SCROLL_UP_COMMAND_ID = 'scroll-up';
const SCROLL_DOWN_COMMAND_ID = 'scroll-down';

interface EditorScrollCommandsSettings {
  offset: number;
  interval: number;
  accelerate: boolean;
  accelRate: number;
  maxAccel: number;
}

const DEFAULT_SETTINGS: EditorScrollCommandsSettings = {
  offset: 4,
  interval: 6,
  accelerate: true,
  accelRate: 0.02,
  maxAccel: 8,
}

export default class EditorScrollCommandsPlugin extends Plugin {
  settings: EditorScrollCommandsSettings;
  intervalId: number;
  editorScrolling: MarkdownFileInfo | null;
  scrollCoef = 1;

  clearInterval() {
    window.clearInterval(this.intervalId);
    this.intervalId = 0;
    this.editorScrolling = null;
    this.scrollCoef = 1;
  }

  scroll(offset: number) {
    let editor = this.app.workspace.activeEditor?.editor;
    if (!editor ||
        // @ts-expect-error
        !editor.activeCM.dom.hasClass('cm-focused')
       ) { return; }

    if (!this.intervalId) {
      this.editorScrolling = this.app.workspace.activeEditor;
      this.intervalId = window.setInterval(() => {
        if (this.settings.accelerate) {
          this.scrollCoef += ((this.scrollCoef < this.settings.maxAccel) ?
                              this.settings.accelRate : 0);
        }
        // @ts-expect-error
        editor?.cm.scrollDOM.scrollBy(0, offset * this.scrollCoef);
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
    return hotkeys?.some((hotkey: Hotkey) => {
      if ((hotkey.key != event.code) &&
        ('Key' + hotkey.key != event.code)) { return false; }

      let mods = hotkey.modifiers;

      if (event.altKey != mods.contains('Alt')) { return false; }
      if (event.shiftKey != mods.contains('Shift')) { return false; }

      if (Platform.isMacOS) {
        if (event.metaKey != (mods.contains('Mod') || mods.contains('Meta')))
          { return false; }
      } else {
        if (event.ctrlKey != (mods.contains('Mod') || mods.contains('Ctrl')))
          { return false; }
      }

      return true;
    });
  }

  isScrollUpHotkeyEvent(event: KeyboardEvent) {
    // @ts-expect-error
    let scrollUpHotkeys = this.app.hotkeyManager.customKeys[`${PLUGIN_ID}:${SCROLL_UP_COMMAND_ID}`];

    return this.isScrollHotkeyEvent(event, scrollUpHotkeys);
  }

  isScrollDownHotkeyEvent(event: KeyboardEvent) {
    // @ts-expect-error
    let scrollDownHotkeys = this.app.hotkeyManager.customKeys[`${PLUGIN_ID}:${SCROLL_DOWN_COMMAND_ID}`];

    return this.isScrollHotkeyEvent(event, scrollDownHotkeys);
  }

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: SCROLL_UP_COMMAND_ID,
      name: 'Scroll up',
      editorCallback: () => {},
    });

    this.addCommand({
      id: SCROLL_DOWN_COMMAND_ID,
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

    new Setting(containerEl).
      setName('Scroll offset').
      setDesc('The number of pixels to scroll per interval, px').
      addText(text => text.
        setPlaceholder('Enter the scroll offset number').
        setValue(this.plugin.settings.offset?.toString()).
        onChange(async (value) => {
          this.plugin.settings.offset =
            parseInt(value, 10) || DEFAULT_SETTINGS.offset;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl).
      setName('Scroll interval').
      setDesc('The scroll offset interval in milliseconds, ms').
      addText(text => text.
        setPlaceholder('Enter the interval amount').
        setValue(this.plugin.settings.interval?.toString()).
        onChange(async (value) => {
          this.plugin.settings.interval =
            parseInt(value, 10) || DEFAULT_SETTINGS.interval;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl).
      setHeading().
      setName('Scroll acceleration');

    new Setting(containerEl).
      setName('Enable scroll acceleration').
      addToggle(text => text.
        setValue(this.plugin.settings.accelerate).
        onChange(async (value) => {
        this.plugin.settings.accelerate = value;
        await this.plugin.saveSettings();
        if (increaseRate && maxRate) {
          increaseRate.setDisabled(!value);
          maxRate.setDisabled(!value);
        }
      })
    );

    let increaseRate = new Setting(containerEl).
      setName('Scroll rate increase').
      setDesc('The step of the increase of the scroll acceleration').
      addText(text => text.
        setValue(this.plugin.settings.accelRate.toString()).
        onChange(async (value) => {
          this.plugin.settings.accelRate =
            parseFloat(value) || DEFAULT_SETTINGS.accelRate;
          await this.plugin.saveSettings();
        })
      );

    let maxRate = new Setting(containerEl).
      setName('Max scroll rate').
      setDesc('Max rate of the scroll acceleration').
      addText(text => text.
      setValue(this.plugin.settings.maxAccel.toString()).
      onChange(async (value) => {
        this.plugin.settings.maxAccel =
          parseFloat(value) || DEFAULT_SETTINGS.maxAccel;
        await this.plugin.saveSettings();
      })
    );
  }
}
