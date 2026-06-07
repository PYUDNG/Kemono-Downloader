// From (source mapped): https://kemono.cr/src/lib/murmurhash.ts

import { murmur2 } from "murmurhash-js";

const FILESERVERS: { percent: number | "", value: string }[] = [
    {
        "percent": 25,
        "value": "https://n1.kemono.cr"
    },
    {
        "percent": 25,
        "value": "https://n2.kemono.cr"
    },
    {
        "percent": 25,
        "value": "https://n3.kemono.cr"
    },
    {
        "percent": "",
        "value": "https://n4.kemono.cr"
    }
];

// See https://nginx.org/en/docs/stream/ngx_stream_split_clients_module.html
// See https://github.com/nginx/nginx/blob/1a82df8cca80458fc3da0968f64624f40cafdf37/src/stream/ngx_stream_split_clients_module.c

function calculateBounds(values: { percent: number | "", value: string }[]): { maxHash: number, value: string }[] {
  let maxHash = 2 ** 32 - 1;
  let sum = 0;
  let last = 0;

  return values.map(({ percent, value }) => {
    sum = percent ? percent + sum : 100;
    if (sum > 100) {
      throw Error("percent total is greater than 100%");
    }
    if (percent) {
      last += Math.floor((percent / 100) * maxHash);
      return { value, maxHash: last };
    } else {
      return { value, maxHash: 0 };
    }
  });
}

const FILESERVER_BOUNDS = calculateBounds(FILESERVERS);

export function getFileserverForValue(value: string): string {
  if (FILESERVERS.length) {
    const hash = murmur2(value);

    for (const entry of FILESERVER_BOUNDS) {
      if (hash < entry.maxHash || entry.maxHash === 0) {
        return entry.value;
      }
    }
  }
  return "";
}

export function fullFileURL(value: string): string {
  let path = `/data${value}`;
  return `${getFileserverForValue(path)}${path}`;
}
