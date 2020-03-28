class Base64 {
  static map: string =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

  static encode(s: string): string {
    if (s == "") return "";
    let len = s.length;
    let acc = "";
    let i = -1;
    let cur: number = 0;
    let avail = 0;
    while (i < len) {
      let x = cur & ((1 << avail) - 1);
      if (avail >= 6) {
        // too many!
        x = x >> (avail -= 6);
      } else {
        // plus (6-avail) from next
        cur = i++ == len ? 0 : s.charCodeAt(i);
        const rest = 6 - avail;
        const newAvail = 16 - rest;
        x = (x << rest) + ((cur >> (16 - rest)) << (16 - rest));
        avail = newAvail;
      }
      acc += Base64.map.charAt(x);
    }
    return acc;
  }

  // static decode(s: string): string {
  //   if (s == "") return "";
  //   let len = s.length;
  //   let output = "", a, b, c, d, e, f, i = 0;
  //     while (i < len) {
  //       let tmp;
  //       tmp = Base64.map.indexOf(s.charAt(i++))
  //       a = (tmp << 10);
  //       tmp = Base64.map.indexOf(s.charAt(i++))
  //       a |= (tmp << 4);
  //       tmp = Base64.map.indexOf(s.charAt(i++))
  //       a |= (tmp >> 2);
  //       b = (tmp )

  //       output += String.fromCharCode(a);
  //       if (f != 64) output += String.fromCharCode(b);
  //       if (g != 64) output += String.fromCharCode(c);
  //     }
  // }
}

console.log("@", Base64.encode("hello hello"));
