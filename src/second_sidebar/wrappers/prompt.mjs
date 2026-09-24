export class PromptServiceWrapper {
  /**
   *
   * @param {Window} window
   * @param {string} title
   * @param {string} text
   */
  static alert(window, title, text) {
    Services.prompt.alert(window, title, text);
  }

  /**
   * Two-button confirmation with custom button labels.
   *
   * @param {Window} window
   * @param {string} title
   * @param {string} text
   * @param {string} acceptLabel
   * @param {string} cancelLabel
   * @returns {boolean} true if the accept button was pressed
   */
  static confirm(window, title, text, acceptLabel, cancelLabel) {
    const prompt = Services.prompt;
    const flags =
      prompt.BUTTON_POS_0 * prompt.BUTTON_TITLE_IS_STRING +
      prompt.BUTTON_POS_1 * prompt.BUTTON_TITLE_IS_STRING +
      prompt.BUTTON_POS_0_DEFAULT;
    const pressed = prompt.confirmEx(
      window,
      title,
      text,
      flags,
      acceptLabel,
      cancelLabel,
      null,
      null,
      {},
    );
    return pressed === 0;
  }
}
