/**
 * Arabic letter rows matching iPhone visual order.
 * Keyboard UI uses dir="rtl", so index 0 renders on the right.
 *
 * On-screen (right → left):
 * 1: ج ح خ ه ع غ ف ق ث ص ض
 * 2: ة ك م ن ت ا ل ب ي س ش
 * 3: ئ ى و ؤ ر ز د ذ ط ظ ء
 * Enter stays right, Delete stays left (see Keyboard.tsx).
 */
export const KEY_ROWS: string[][] = [
  Array.from("جحخهعغفقثصض"),
  Array.from("ةكمنتالبيسش"),
  Array.from("ئىوؤرزدذطظء"),
];
