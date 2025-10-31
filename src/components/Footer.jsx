import { useState, useEffect } from 'react';
import Link from 'next/link';
export default function Footer() {
  return (
    <footer className="w-full text-center text-xs text-neutral-500 py-2">
      Copyright © 2024 All rights reserved. 请勿上传违反中国法律的图片，违者后果自负。
      本程序基于 Cloudflare Pages，开源于
      {' '}
      <a
        href="https://github.com/x-dr/telegraph-Image"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-4 hover:no-underline text-sky-500"
      >
        GitHub Telegraph-Image
      </a>
      。
    </footer>
  );
}
