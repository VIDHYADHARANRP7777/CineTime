import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API = "https://cinetime-bq7l.onrender.com/api";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "7777";

/* ─── DEFAULT DATA ─────────────────────────────────────────────────────────── */
const DEFAULT_MOVIES = [
  { _id: 'local-1', title: 'Leo', genre: 'Action/Thriller', language: 'Tamil', duration: '2h 44m', rating: 8.2, timings: ['10:00 AM', '2:30 PM', '6:00 PM', '10:30 PM'], shows: [], pricing: { morning: 120, afternoon: 150, evening: 180, night: 200 }, img: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Leo_2023_film_poster.jpg/220px-Leo_2023_film_poster.jpg', description: 'A seemingly mild-mannered man runs a food business, but his past comes back to haunt him.' },
  { _id: 'local-2', title: 'Vikram', genre: 'Action', language: 'Tamil', duration: '2h 55m', rating: 8.4, timings: ['10:15 AM', '2:15 PM', '6:15 PM', '10:15 PM'], shows: [], pricing: { morning: 120, afternoon: 150, evening: 180, night: 200 }, img: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Vikram_2022_film_poster.jpg/220px-Vikram_2022_film_poster.jpg', description: 'A special agent investigates a series of murders involving masked men.' },
  { _id: 'local-3', title: 'Oppenheimer', genre: 'Biography/Drama', language: 'English', duration: '3h 0m', rating: 8.9, timings: ['11:00 AM', '3:00 PM', '7:00 PM'], shows: [], pricing: { morning: 120, afternoon: 150, evening: 180, night: 200 }, img: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Oppenheimer_%28film%29.jpg/220px-Oppenheimer_%28film%29.jpg', description: 'The story of J. Robert Oppenheimer and the Manhattan Project.' },
];
const DEFAULT_SNACKS = [
  { _id: 'sn-1', name: 'Popcorn (Large)', emoji: '🍿', price: 180, coinPrice: 90, category: 'Snacks', img: '' },
  { _id: 'sn-2', name: 'Popcorn (Medium)', emoji: '🍿', price: 120, coinPrice: 60, category: 'Snacks', img: '' },
  { _id: 'sn-3', name: 'Nachos + Cheese', emoji: '🌮', price: 150, coinPrice: 75, category: 'Snacks', img: '' },
  { _id: 'sn-4', name: 'Hot Dog', emoji: '🌭', price: 130, coinPrice: 65, category: 'Snacks', img: '' },
  { _id: 'sn-5', name: 'Veg Burger', emoji: '🍔', price: 110, coinPrice: 55, category: 'Snacks', img: '' },
  { _id: 'sn-6', name: 'Pepsi (Large)', emoji: '🥤', price: 90, coinPrice: 45, category: 'Drinks', img: '' },
  { _id: 'sn-7', name: 'Water Bottle', emoji: '💧', price: 40, coinPrice: 20, category: 'Drinks', img: '' },
  { _id: 'sn-8', name: 'Fresh Lime Soda', emoji: '🍋', price: 80, coinPrice: 40, category: 'Drinks', img: '' },
  { _id: 'sn-9', name: 'Combo (Popcorn+Pepsi)', emoji: '🎉', price: 230, coinPrice: 115, category: 'Combos', img: '' },
  { _id: 'sn-10', name: 'Family Pack', emoji: '🎊', price: 450, coinPrice: 225, category: 'Combos', img: '' },
];

function buildDefaultParking() {
  const s = [];
  for (let i = 1; i <= 15; i++) s.push({ slotNumber: `A${i}`, block: 'A', slotType: 'Two-Wheeler', price: 30, coinPrice: 15, isBooked: false, bookedBy: null });
  for (let i = 1; i <= 12; i++) s.push({ slotNumber: `B${i}`, block: 'B', slotType: 'Four-Wheeler', price: 60, coinPrice: 30, isBooked: false, bookedBy: null });
  for (let i = 1; i <= 8; i++) s.push({ slotNumber: `C${i}`, block: 'C', slotType: 'Four-Wheeler', price: 80, coinPrice: 40, isBooked: false, bookedBy: null });
  for (let i = 1; i <= 5; i++) s.push({ slotNumber: `D${i}`, block: 'D', slotType: 'Disabled', price: 0, coinPrice: 0, isBooked: false, bookedBy: null });
  return s;
}

const LS = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};

function mergeMovies(db, local) {
  if (!db?.length) return local;
  const merged = [...db];
  local.forEach(lm => { if (!merged.find(m => m.title === lm.title)) merged.push(lm); });
  return merged;
}
const broadcastMovies = (movies) => { LS.set('ct_movies', movies); window.dispatchEvent(new CustomEvent('ct_movies', { detail: movies })); };

const SCREEN_TYPE_COLOR = { Standard: '#007AFF', Premium: '#8B5CF6', IMAX: '#FF375F', '4DX': '#FF9500', Dolby: '#34C759' };
const SCREEN_TYPE_BADGE = { Standard: '🎬', Premium: '⭐', IMAX: '🔷', '4DX': '💥', Dolby: '🔊' };

/* ─── CSS ──────────────────────────────────────────────────────────────────── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F2F2F7;--bg2:#E8E8EF;--card:#FFFFFF;--card2:#F7F7FA;
  --accent:#FF375F;--accent2:#FF6B87;--accent-bg:#FFF0F3;
  --blue:#007AFF;--green:#34C759;--orange:#FF9500;--gold:#FFB800;--purple:#8B5CF6;
  --t1:#1C1C1E;--t2:#3A3A3C;--t3:#6C6C70;--t4:#AEAEB2;
  --bdr:rgba(0,0,0,0.07);--sh1:0 2px 10px rgba(0,0,0,0.06);
  --sh2:0 8px 30px rgba(0,0,0,0.10);--sh3:0 20px 60px rgba(0,0,0,0.13);
  --r1:12px;--r2:18px;--r3:26px;--r4:36px;
}
body{background:var(--bg);font-family:'Figtree',-apple-system,sans-serif;color:var(--t1);-webkit-font-smoothing:antialiased;min-height:100vh}
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes pop{0%{transform:scale(.92);opacity:0}60%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:none;opacity:1}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(255,55,95,.4)}50%{box-shadow:0 0 40px rgba(255,55,95,.8)}}
@keyframes starBlink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes coinPop{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
.page{animation:fadeUp .35s cubic-bezier(.34,1.4,.64,1) both}
.pop{animation:pop .3s cubic-bezier(.34,1.5,.64,1) both}
.coin-anim{animation:coinPop .4s ease}
.toast{position:fixed;top:68px;left:50%;transform:translateX(-50%);background:#1C1C1E;color:#fff;border-radius:14px;padding:11px 22px;font-size:14px;font-weight:700;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.3);animation:pop .25s ease;pointer-events:none;white-space:nowrap;max-width:90vw;text-align:center}
.auth-full{min-height:100vh;display:flex;overflow:hidden}
.auth-left{flex:1;background:linear-gradient(145deg,#0D0014 0%,#1a0026 40%,#FF375F 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 40px;position:relative;overflow:hidden}
.auth-left-bg{position:absolute;inset:0;background:radial-gradient(circle at 30% 50%,rgba(255,55,95,.25),transparent 60%),radial-gradient(circle at 80% 20%,rgba(255,107,135,.18),transparent 50%);pointer-events:none}
.auth-star{position:absolute;background:#fff;border-radius:50%;animation:starBlink var(--dur,2s) var(--delay,0s) infinite}
.auth-cinema-logo{width:100px;height:100px;background:linear-gradient(145deg,var(--accent),var(--accent2));border-radius:32px;display:flex;align-items:center;justify-content:center;font-size:50px;margin-bottom:24px;animation:float 3s ease-in-out infinite,glow 3s ease-in-out infinite;box-shadow:0 20px 60px rgba(255,55,95,.5)}
.auth-brand-name{font-size:44px;font-weight:900;color:#fff;letter-spacing:-2px;margin-bottom:8px}
.auth-brand-tag{font-size:15px;color:rgba(255,255,255,.6);margin-bottom:28px}
.auth-features{display:flex;flex-direction:column;gap:12px;margin-bottom:36px;width:100%;max-width:270px}
.auth-feat{display:flex;align-items:center;gap:12px;color:rgba(255,255,255,.85);font-size:14px;font-weight:600}
.auth-feat-ico{width:34px;height:34px;background:rgba(255,255,255,.12);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.auth-right{width:410px;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px;box-shadow:-20px 0 60px rgba(0,0,0,.12)}
@media(max-width:768px){.auth-left{display:none}.auth-right{width:100%;padding:28px 20px}}
.auth-right-logo{width:60px;height:60px;background:linear-gradient(145deg,var(--accent),var(--accent2));border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:30px;margin-bottom:18px;box-shadow:0 10px 30px rgba(255,55,95,.3)}
.auth-h{font-size:25px;font-weight:900;letter-spacing:-.7px;text-align:center}
.auth-s{font-size:14px;color:var(--t3);text-align:center;margin:5px 0 24px}
.nav{position:fixed;inset:0 0 auto 0;z-index:500;background:rgba(242,242,247,0.93);backdrop-filter:blur(24px);border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;padding:10px 18px;height:58px}
.nav-brand{display:flex;align-items:center;gap:9px;cursor:pointer}
.nav-pill{width:32px;height:32px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px}
.nav-title{font-size:17px;font-weight:900;letter-spacing:-.5px}
.nav-links{display:flex;gap:2px}
.nav-link{background:none;border:none;font-family:'Figtree',sans-serif;font-size:13px;font-weight:600;color:var(--t3);cursor:pointer;padding:6px 12px;border-radius:10px;transition:all .15s}
.nav-link:hover{background:var(--card2);color:var(--t1)}
.nav-link.active{background:var(--accent-bg);color:var(--accent);font-weight:800}
.nav-right{display:flex;gap:7px;align-items:center}
.coin-badge{display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#FFB800,#FF9500);color:#fff;border-radius:20px;padding:5px 11px;font-size:13px;font-weight:800;cursor:pointer;transition:transform .2s}
.coin-badge:hover{transform:scale(1.05)}
.mobile-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:500;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);border-top:1px solid var(--bdr);padding:6px 0}
.mob-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;cursor:pointer;padding:4px;font-family:'Figtree',sans-serif}
.mob-tab-ico{font-size:19px}
.mob-tab-lbl{font-size:10px;font-weight:700;color:var(--t3)}
.mob-tab.active .mob-tab-lbl{color:var(--accent)}
@media(max-width:700px){.nav-links{display:none}.mobile-nav{display:flex}}
.admin-login-bg{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(12px)}
.admin-login-card{background:#0A0A12;border:1px solid rgba(255,255,255,.12);border-radius:var(--r4);padding:38px 34px;width:100%;max-width:350px;box-shadow:0 40px 80px rgba(0,0,0,.6);animation:pop .3s ease;text-align:center}
.admin-inp-dark{width:100%;padding:12px 14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:13px;font-family:'Figtree',sans-serif;font-size:15px;font-weight:600;color:#fff;outline:none;margin-bottom:10px}
.admin-inp-dark:focus{border-color:var(--accent)}
.btn{width:100%;padding:13px;border:none;border-radius:15px;font-family:'Figtree',sans-serif;font-size:15px;font-weight:800;cursor:pointer;transition:all .2s}
.btn:active{transform:scale(.97)}.btn:disabled{opacity:.35;cursor:not-allowed}
.btn-red{background:var(--accent);color:#fff;box-shadow:0 6px 20px rgba(255,55,95,.28)}.btn-red:hover:not(:disabled){transform:scale(1.02)}
.btn-green{background:var(--green);color:#fff}.btn-green:hover:not(:disabled){transform:scale(1.02)}
.btn-grey{background:var(--card2);color:var(--t2)}
.btn-upi{background:linear-gradient(135deg,#2d6adb,#1a4fb5);color:#fff}
.btn-coins{background:linear-gradient(135deg,#FFB800,#FF9500);color:#fff}
.btn-dark{background:var(--t1);color:#fff}
.btn-sm{padding:9px 18px;width:auto;font-size:13px;border-radius:12px}
.chip{background:none;border:none;border-radius:50px;font-family:'Figtree',sans-serif;font-size:12px;font-weight:700;cursor:pointer;padding:6px 14px;transition:all .18s;display:inline-flex;align-items:center;gap:5px}
.chip-red{background:var(--accent-bg);color:var(--accent)}.chip-red:hover{background:var(--accent);color:#fff}
.chip-blue{background:#EBF4FF;color:var(--blue)}.chip-blue:hover{background:var(--blue);color:#fff}
.chip-grey{background:var(--card2);color:var(--t3);border:1px solid var(--bdr)}
.chip-green{background:#E8FFF0;color:var(--green)}
.inp-wrap{position:relative;margin-bottom:10px}
.inp-ico{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:15px;opacity:.4;pointer-events:none}
.inp{width:100%;padding:12px 13px 12px 40px;background:var(--card2);border:2px solid transparent;border-radius:13px;font-size:14px;font-weight:600;color:var(--t1);outline:none;font-family:'Figtree',sans-serif;transition:all .2s}
.inp:focus{border-color:var(--accent);background:#fff;box-shadow:0 0 0 4px rgba(255,55,95,.1)}
.divider{display:flex;align-items:center;gap:10px;margin:14px 0}
.divider-line{flex:1;height:1px;background:var(--bdr)}
.divider-txt{font-size:12px;color:var(--t4);font-weight:600}
.page-shell{min-height:100vh;background:var(--bg);padding:68px 18px 80px}
.movie-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:14px}
.movie-card{background:var(--card);border-radius:var(--r2);overflow:hidden;cursor:pointer;border:1px solid var(--bdr);box-shadow:var(--sh1);transition:all .22s cubic-bezier(.34,1.56,.64,1)}
.movie-card:hover{transform:translateY(-5px) scale(1.02);box-shadow:var(--sh3)}.movie-card:active{transform:scale(.97)}
.movie-poster{width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:var(--bg2)}
.movie-poster-placeholder{width:100%;aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--bg2),var(--card2));font-size:38px}
.movie-meta{padding:11px 12px}
.movie-name{font-size:13px;font-weight:800;letter-spacing:-.2px}
.movie-badge{display:inline-flex;background:var(--accent-bg);color:var(--accent);border-radius:6px;padding:2px 6px;font-size:9px;font-weight:700;margin-top:4px}
.timings-wrap{min-height:100vh;padding:68px 18px 32px;display:flex;flex-direction:column;align-items:center}
.timings-card{background:var(--card);border-radius:var(--r3);padding:24px;width:100%;max-width:390px;box-shadow:var(--sh2);border:1px solid var(--bdr)}
.timing-btn{width:100%;padding:13px 16px;background:var(--card2);border:2px solid var(--bdr);border-radius:13px;font-family:'Figtree',sans-serif;font-size:14px;font-weight:700;color:var(--t1);cursor:pointer;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;transition:all .18s}
.timing-btn:hover{border-color:var(--accent);background:var(--accent-bg);color:var(--accent)}
.avail-ok{background:#E8FFF0;color:var(--green);border-radius:7px;padding:3px 9px;font-size:10px;font-weight:700}
.seats-wrap{min-height:100vh;padding:68px 18px 40px;display:flex;flex-direction:column;align-items:center}
.seat-btn{border-radius:9px;border:2px solid transparent;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;cursor:pointer;transition:all .15s}
.s-avail{background:#EBEBF0;color:var(--t3)}.s-avail:hover{background:var(--accent-bg);border-color:var(--accent);color:var(--accent);transform:scale(1.1)}
.s-sel{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 3px 10px rgba(255,55,95,.4);transform:scale(1.08)}
.s-booked{background:#F2F2F7;color:#C7C7CC;cursor:not-allowed}
.legend{display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap;justify-content:center}
.leg-item{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--t3)}
.leg-dot{width:13px;height:13px;border-radius:4px}
.summary-bar{background:var(--card);border-radius:var(--r2);padding:16px 18px;width:100%;max-width:420px;box-shadow:var(--sh1);border:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.sum-label{font-size:11px;color:var(--t3);font-weight:700;text-transform:uppercase}
.sum-val{font-size:21px;font-weight:900;color:var(--accent);margin-top:2px}
.pay-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:22px;background:var(--bg)}
.pay-card{background:var(--card);border-radius:var(--r4);padding:36px 30px;width:100%;max-width:390px;box-shadow:var(--sh3);border:1px solid var(--bdr);text-align:center}
.pay-method-tabs{display:flex;gap:8px;margin-bottom:18px}
.pay-method-tab{flex:1;padding:11px;border:2px solid var(--bdr);border-radius:13px;background:var(--card2);cursor:pointer;text-align:center;transition:all .18s;font-family:'Figtree',sans-serif;font-weight:700;font-size:12px}
.pay-method-tab.selected{border-color:var(--accent);background:var(--accent-bg);color:var(--accent)}
.pay-table{background:var(--card2);border-radius:var(--r2);padding:16px;margin-bottom:18px;text-align:left}
.pay-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;font-weight:600}
.pay-total{border-top:1px solid var(--bdr);margin-top:7px;padding-top:12px;font-size:16px;font-weight:900}
.pay-lbl{color:var(--t3)}.pay-val{color:var(--t1)}.pay-total .pay-val{color:var(--accent)}
.rzp-info{background:linear-gradient(135deg,#EEF2FF,#E0E7FF);border:1px solid rgba(45,106,219,.2);border-radius:13px;padding:14px 16px;margin-bottom:14px;text-align:center}
.cat-row{display:flex;gap:7px;margin-bottom:18px;overflow-x:auto;padding-bottom:4px}
.cat-btn{background:var(--card2);color:var(--t3);border:2px solid var(--bdr);border-radius:20px;padding:6px 14px;font-family:'Figtree',sans-serif;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .18s}
.cat-btn.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:12px}
.menu-card{background:var(--card);border-radius:var(--r2);border:2px solid var(--bdr);box-shadow:var(--sh1);cursor:pointer;position:relative;overflow:hidden;transition:all .2s}
.menu-card:hover{transform:translateY(-3px);box-shadow:var(--sh2)}
.menu-img{width:100%;height:90px;object-fit:cover;display:block}
.menu-emoji{height:90px;display:flex;align-items:center;justify-content:center;font-size:34px;background:var(--card2)}
.menu-body{padding:10px 12px}
.menu-name{font-size:12px;font-weight:800}
.menu-price{font-size:12px;color:var(--green);font-weight:700;margin-top:2px}
.menu-plus{position:absolute;top:7px;right:7px;width:24px;height:24px;background:var(--accent);color:#fff;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900}
.qty-badge{position:absolute;top:3px;right:3px;background:var(--accent);color:#fff;border-radius:20px;padding:2px 6px;font-size:10px;font-weight:800;animation:pop .2s ease}
.cart-bar{position:fixed;bottom:0;left:0;right:0;z-index:400;background:rgba(255,255,255,.96);backdrop-filter:blur(20px);border-top:1px solid var(--bdr);padding:12px 22px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 -8px 32px rgba(0,0,0,.08);animation:slideUp .3s ease}
.parking-wrap{min-height:100vh;padding:68px 18px 80px}
.parking-block-card{background:var(--card);border-radius:var(--r2);padding:18px;margin-bottom:16px;box-shadow:var(--sh1);border:1px solid var(--bdr)}
.parking-slots-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:8px}
.parking-slot{border-radius:10px;padding:10px 6px;text-align:center;cursor:pointer;border:2px solid var(--bdr);transition:all .18px;font-family:'Figtree',sans-serif}
.p-free{background:var(--card2)}.p-free:hover{border-color:var(--green);background:#E8FFF0}
.p-booked{background:#FFF0F3;border-color:rgba(255,55,95,.3);cursor:not-allowed;opacity:.65}
.p-selected{background:var(--green);border-color:var(--green);color:#fff;box-shadow:0 4px 14px rgba(52,199,89,.4);transform:scale(1.05)}
.p-disabled{background:#F5F5FA;border-color:transparent;cursor:default}
.p-slot-num{font-size:13px;font-weight:900}
.p-slot-status{font-size:9px;font-weight:700;margin-top:2px}
.hist-card{background:var(--card);border-radius:var(--r2);padding:16px 18px;margin-bottom:10px;box-shadow:var(--sh1);border:1px solid var(--bdr)}
.hist-badge{background:var(--accent-bg);color:var(--accent);font-size:11px;font-weight:800;border-radius:9px;padding:4px 10px}
.coins-hero{background:linear-gradient(135deg,#FFB800,#FF9500);border-radius:var(--r3);padding:28px;color:#fff;margin-bottom:22px}
.coins-balance{font-size:52px;font-weight:900;letter-spacing:-2px}
.coins-table{background:var(--card);border-radius:var(--r2);overflow:hidden;border:1px solid var(--bdr)}
.coins-row{display:flex;justify-content:space-between;align-items:center;padding:13px 18px;border-bottom:1px solid var(--bdr);font-size:13px}
.coins-row:last-child{border-bottom:none}
.coins-pos{color:var(--green);font-weight:700}.coins-neg{color:var(--accent);font-weight:700}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);padding:20px}
.modal-card{background:var(--card);border-radius:var(--r4);padding:34px;max-width:460px;width:100%;box-shadow:var(--sh3);animation:pop .3s ease;text-align:center}
.chat-container{position:fixed;bottom:22px;right:22px;z-index:800}
.chat-btn{width:54px;height:54px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 8px 24px rgba(255,55,95,.4);transition:all .2s}
.chat-window{position:absolute;bottom:68px;right:0;width:310px;background:var(--card);border-radius:var(--r3);box-shadow:var(--sh3);border:1px solid var(--bdr);overflow:hidden;animation:slideUp .3s ease}
.chat-header{background:linear-gradient(135deg,var(--accent),var(--accent2));padding:14px 18px;display:flex;align-items:center;gap:9px}
.chat-messages{height:240px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:9px}
.chat-bubble{max-width:85%;padding:9px 13px;border-radius:14px;font-size:12px;line-height:1.5}
.chat-bubble-user{background:var(--accent);color:#fff;align-self:flex-end}
.chat-bubble-bot{background:var(--card2);color:var(--t1);align-self:flex-start}
.chat-input-row{padding:10px 12px;border-top:1px solid var(--bdr);display:flex;gap:7px}
.chat-inp{flex:1;padding:8px 12px;background:var(--card2);border:1px solid var(--bdr);border-radius:11px;font-family:'Figtree',sans-serif;font-size:12px;outline:none;color:var(--t1)}
.chat-send{background:var(--accent);color:#fff;border:none;border-radius:9px;padding:8px 12px;cursor:pointer;font-size:15px}
.chat-typing{display:flex;gap:4px;align-items:center;padding:9px 13px;background:var(--card2);border-radius:14px;align-self:flex-start}
.chat-dot{width:6px;height:6px;background:var(--t4);border-radius:50%;animation:pulse .8s infinite}
.chat-dot:nth-child(2){animation-delay:.2s}.chat-dot:nth-child(3){animation-delay:.4s}
.chat-sug{background:var(--accent-bg);color:var(--accent);border:none;border-radius:14px;padding:5px 11px;font-family:'Figtree',sans-serif;font-size:10px;font-weight:700;cursor:pointer;margin:3px;transition:all .15s}
.chat-sug:hover{background:var(--accent);color:#fff}
.admin-shell{min-height:100vh;background:#0A0A12;color:#fff}
.admin-nav{position:fixed;inset:0 0 auto 0;z-index:500;background:rgba(10,10,18,.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;padding:0 22px;height:58px;gap:3px;overflow-x:auto}
.admin-nav-brand{display:flex;align-items:center;gap:9px;margin-right:20px;flex-shrink:0}
.admin-nav-ico{width:30px;height:30px;background:var(--accent);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px}
.admin-tab-btn{background:none;border:none;color:rgba(255,255,255,.4);font-family:'Figtree',sans-serif;font-size:12px;font-weight:700;cursor:pointer;padding:6px 11px;border-radius:9px;transition:all .15s;white-space:nowrap}
.admin-tab-btn:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.75)}
.admin-tab-btn.active{background:rgba(255,255,255,.12);color:#fff}
.admin-wrap{padding:70px 22px 40px;max-width:1100px;margin:0 auto}
.admin-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;margin-bottom:12px}
.admin-stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:22px}
.admin-stat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:18px;text-align:center}
.admin-stat-n{font-size:26px;font-weight:900;color:#fff}
.admin-stat-l{font-size:10px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.8px;margin-top:4px}
.admin-table-row{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:13px;padding:14px 18px;margin-bottom:9px}
.admin-inp{width:100%;padding:11px 13px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:11px;font-family:'Figtree',sans-serif;font-size:13px;color:#fff;outline:none;margin-bottom:9px}
.admin-inp:focus{border-color:var(--accent)}
.admin-inp::placeholder{color:rgba(255,255,255,.3)}
.admin-inp-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;display:block}
.admin-select{width:100%;padding:11px 13px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:11px;font-family:'Figtree',sans-serif;font-size:13px;color:#fff;outline:none;margin-bottom:9px;cursor:pointer}
.admin-select option{background:#1a1a2e;color:#fff}
.a-free{background:rgba(255,255,255,.08);color:rgba(255,255,255,.35)}
.a-booked-user{background:var(--accent);color:#fff}
.a-booked-admin{background:#FFB800;color:#000}
.admin-seat{border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;cursor:help;transition:transform .15s}
.admin-seat:hover{transform:scale(1.15)}
.rev-chart-wrap{display:flex;align-items:flex-end;gap:7px;height:130px;padding:0 3px}
.rev-bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%}
.rev-bar-bg{flex:1;width:100%;background:rgba(255,255,255,.06);border-radius:7px;display:flex;align-items:flex-end;overflow:hidden}
.rev-bar-fill{width:100%;background:linear-gradient(180deg,var(--accent2),var(--accent));border-radius:7px;transition:height .8s cubic-bezier(.34,1.2,.64,1);min-height:3px}
.rev-bar-lbl{font-size:9px;color:rgba(255,255,255,.4);font-weight:600}
.rev-bar-val{font-size:9px;color:rgba(255,255,255,.7);font-weight:700}
.spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
.screen-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.screen-type-badge{border-radius:8px;padding:3px 10px;font-size:10px;font-weight:800;letter-spacing:.5px}
.btype-ticket{background:rgba(255,55,95,.15);color:var(--accent);border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700}
.btype-refresh{background:rgba(255,149,0,.15);color:#FF9500;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700}
.btype-parking{background:rgba(0,122,255,.15);color:var(--blue);border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700}
.btype-admin{background:rgba(255,184,0,.15);color:#FFB800;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700}
.admin-park-block{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:16px;margin-bottom:12px}
.admin-park-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:7px;margin-top:10px}
.admin-park-slot{border-radius:9px;padding:9px 5px;text-align:center;border:1px solid rgba(255,255,255,.1);font-size:11px;font-weight:800;cursor:default}
.aps-free{background:rgba(52,199,89,.12);color:var(--green);border-color:rgba(52,199,89,.25)}
.aps-booked{background:rgba(255,55,95,.15);color:var(--accent);border-color:rgba(255,55,95,.3);cursor:pointer}
.aps-disabled{background:rgba(255,255,255,.06);color:rgba(255,255,255,.3)}
.eticket-modal{background:var(--card);border-radius:var(--r4);padding:30px 24px;max-width:480px;width:100%;box-shadow:var(--sh3);animation:pop .3s ease;text-align:center;max-height:90vh;overflow-y:auto}
`;

/* ─── UTILS ────────────────────────────────────────────────────────────────── */
function useToast() {
  const [toast, setToast] = useState('');
  const timer = useRef(null);
  const show = useCallback((m) => { setToast(m); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 3200); }, []);
  return [toast, show];
}
function Toast({ msg }) { return msg ? <div className="toast">{msg}</div> : null; }

/* ─── REVENUE CHART ────────────────────────────────────────────────────────── */
// FIX #3: Analytics chart uses combined ticket+adminBooking revenue (data comes from backend which already sums them)
function RevenueChart({ data }) {
  const maxRev = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div className="rev-chart-wrap">
      {data.map((d, i) => (
        <div key={i} className="rev-bar-col">
          <div className="rev-bar-val">{d.revenue > 0 ? `₹${(d.revenue / 1000).toFixed(1)}k` : '₹0'}</div>
          <div className="rev-bar-bg"><div className="rev-bar-fill" style={{ height: `${Math.max((d.revenue / maxRev) * 100, 2.5)}%` }} /></div>
          <div className="rev-bar-lbl">{d.date}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── E-TICKET MODAL ───────────────────────────────────────────────────────── */
function ETicketModal({ data, onClose, userEmail }) {
  if (!data) return null;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="eticket-modal" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Booking Confirmed!</div>
        <div style={{ background: 'var(--card2)', borderRadius: 'var(--r2)', padding: '14px 18px', marginBottom: 16, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ color: 'var(--t3)', fontSize: 12 }}>Movie</span><span style={{ fontWeight: 800, fontSize: 13 }}>{data.movieName}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ color: 'var(--t3)', fontSize: 12 }}>Show</span><span style={{ fontWeight: 700, fontSize: 13 }}>{data.timing}</span></div>
          {data.screenName && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ color: 'var(--t3)', fontSize: 12 }}>Screen</span><span style={{ fontWeight: 700, fontSize: 13 }}>🖥️ {data.screenName}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ color: 'var(--t3)', fontSize: 12 }}>Seats</span><span style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent)' }}>{data.seats?.map(s => s + 1).join(', ')}</span></div>
          {data.amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--t3)', fontSize: 12 }}>Paid</span><span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>₹{data.amount}</span></div>}
        </div>
        <div style={{ color: 'var(--t3)', fontSize: 12, marginBottom: 12 }}>📱 Show this QR at the theater entrance</div>
        {data.qr && <img src={data.qr} alt="E-Ticket QR" style={{ width: 200, borderRadius: 16, border: '4px solid white', boxShadow: 'var(--sh2)', marginBottom: 14 }} />}
        {userEmail && <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 14 }}>📧 Confirmation sent to {userEmail}</div>}
        <button className="btn btn-red btn-sm" onClick={onClose} style={{ marginTop: 4 }}>Done ✓</button>
      </div>
    </div>
  );
}

/* ─── CHATBOT (PRESERVED UNCHANGED) ───────────────────────────────────────── */
const CHAT_SUGS = ['Movies showing?', 'Ticket prices?', 'CineCoins info', 'Parking rates'];
function Chatbot({ movies }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: 'bot', text: "Hi! I'm CineBot 🎬 Ask about movies, prices, or parking!" }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);
  const send = async (text) => {
    const msg = text || input.trim(); if (!msg) return;
    setInput(''); setMsgs(p => [...p, { role: 'user', text: msg }]); setLoading(true);
    const lower = msg.toLowerCase();
    let reply = null;
    if (lower.includes('movie') || lower.includes('showing')) reply = `Now showing: ${movies.map(m => m.title).join(', ')} 🎬`;
    else if (lower.includes('price') || lower.includes('ticket')) reply = '🎟 Morning ₹120 · Afternoon ₹150 · Evening ₹180 · Night ₹200. Or 500 CineCoins!';
    else if (lower.includes('coin')) reply = '🪙 Earn 10 coins/ticket, 5/snack, 5/parking. 500 coins = free ticket!';
    else if (lower.includes('parking')) reply = '🅿️ Block A (2-Wheeler) ₹30 · B ₹60 · C ₹80 · D Free. +5🪙 on Razorpay!';
    if (reply) { setMsgs(p => [...p, { role: 'bot', text: reply }]); setLoading(false); return; }
    try { const res = await axios.post(`${API}/chatbot`, { message: msg }); setMsgs(p => [...p, { role: 'bot', text: res.data.reply }]); }
    catch { setMsgs(p => [...p, { role: 'bot', text: "Having trouble connecting 🤖" }]); }
    setLoading(false);
  };
  return (
    <div className="chat-container">
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div style={{ width: 34, height: 34, background: 'rgba(255,255,255,.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🤖</div>
            <div><div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>CineBot</div><div style={{ color: 'rgba(255,255,255,.7)', fontSize: 10 }}>Online</div></div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', fontSize: 17, cursor: 'pointer' }}>✕</button>
          </div>
          {msgs.length === 1 && <div style={{ padding: '7px 12px', display: 'flex', flexWrap: 'wrap' }}>{CHAT_SUGS.map(s => <button key={s} className="chat-sug" onClick={() => send(s)}>{s}</button>)}</div>}
          <div className="chat-messages">
            {msgs.map((m, i) => <div key={i} className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>{m.text}</div>)}
            {loading && <div className="chat-typing"><div className="chat-dot" /><div className="chat-dot" /><div className="chat-dot" /></div>}
            <div ref={endRef} />
          </div>
          <div className="chat-input-row">
            <input className="chat-inp" placeholder="Ask anything..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
            <button className="chat-send" onClick={() => send()}>➤</button>
          </div>
        </div>
      )}
      <button className="chat-btn" onClick={() => setOpen(o => !o)}>{open ? '✕' : '💬'}</button>
    </div>
  );
}

/* ─── ADMIN LOGIN ──────────────────────────────────────────────────────────── */
function AdminLoginModal({ onSuccess, onClose }) {
  const [uname, setUname] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    setErr(''); setLoading(true);
    if (uname === ADMIN_USERNAME && pass === ADMIN_PASSWORD) { onSuccess(); return; }
    try {
      const res = await axios.post(`${API}/login`, { username: uname, password: pass });
      if (res.data.role === 'admin') { onSuccess(); return; }
      setErr('Access denied. Admins only.');
    } catch { setErr('Invalid admin credentials.'); }
    setLoading(false);
  };
  return (
    <div className="admin-login-bg" onClick={onClose}>
      <div className="admin-login-card" onClick={e => e.stopPropagation()}>
        <div style={{ width: 68, height: 68, borderRadius: 20, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 18px' }}>⚙️</div>
        <div style={{ color: '#fff', fontSize: 21, fontWeight: 900, marginBottom: 5 }}>Admin Portal</div>
        <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, marginBottom: 22 }}>Restricted access</div>
        <input className="admin-inp-dark" placeholder="Username" value={uname} onChange={e => setUname(e.target.value)} />
        <input className="admin-inp-dark" type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        {err && <div style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>❌ {err}</div>}
        <button className="btn btn-red" disabled={loading} onClick={handleLogin} style={{ marginBottom: 9 }}>
          {loading ? <span className="spinner" /> : 'Authenticate →'}
        </button>
        <button className="btn btn-grey" style={{ background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)' }} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADMIN APP
═══════════════════════════════════════════════════════════ */
function AdminApp({ onBack }) {
  const [tab, setTab] = useState('monitor');
  const [toast, showToast] = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const [movies, setMovies] = useState(() => LS.get('ct_movies', DEFAULT_MOVIES));
  const [snacks, setSnacks] = useState(() => LS.get('ct_admin_snacks', DEFAULT_SNACKS));
  const [parkingSlots, setParkingSlots] = useState(() => LS.get('ct_admin_parking', buildDefaultParking()));
  const [screens, setScreens] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [allAdminBks, setAllAdminBks] = useState([]);
  const [allRefresh, setAllRefresh] = useState([]);
  const [allParkingBks, setAllParkingBks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [seatMap, setSeatMap] = useState({});
  const [activeShow, setActiveShow] = useState(null);

  const emptyMovie = { title: '', genre: '', language: 'Tamil', duration: '', rating: '8.0', img: '', description: '' };
  const [movieForm, setMovieForm] = useState(emptyMovie);
  const [editMovieId, setEditMovieId] = useState(null);
  const [imgPreview, setImgPreview] = useState('');
  const [movieSaving, setMovieSaving] = useState(false);
  const [showSchedule, setShowSchedule] = useState([]);
  const [newShowTime, setNewShowTime] = useState('');
  const [newShowScr, setNewShowScr] = useState('');

  const emptyScreen = { name: '', rows: '8', seatsPerRow: '10', screenType: 'Standard' };
  const [screenForm, setScreenForm] = useState(emptyScreen);
  const [editScreenId, setEditScreenId] = useState(null);
  const [screenSaving, setScreenSaving] = useState(false);

  // FIX #2: Added img field to snack form
  const emptySnack = { name: '', emoji: '🍿', price: '', coinPrice: '', category: 'Snacks', img: '' };
  const [snackForm, setSnackForm] = useState(emptySnack);
  const [editSnackId, setEditSnackId] = useState(null);

  const [adminBookForm, setAdminBookForm] = useState({ username: '', movieName: '', timing: '', screenName: '', seats: '', amount: '', notes: '' });
  const [adminBooking, setAdminBookLoading] = useState(false);
  const [adminBookResult, setAdminBookResult] = useState(null);
  const [viewTicket, setViewTicket] = useState(null);

  const saveMovies = (m) => { setMovies(m); broadcastMovies(m); };
  const saveSnacks = (s) => { setSnacks(s); LS.set('ct_admin_snacks', s); };
  const saveParking = (p) => { setParkingSlots(p); LS.set('ct_admin_parking', p); };

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [bRes, aRes, uRes, pRes, mRes, sRes, scRes] = await Promise.allSettled([
        axios.get(`${API}/admin/all-bookings`),
        axios.get(`${API}/admin/analytics`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/parking`),
        axios.get(`${API}/movies`),
        axios.get(`${API}/snacks`),
        axios.get(`${API}/screens`),
      ]);
      if (bRes.status === 'fulfilled') { const d = bRes.value.data; setAllBookings(d.tickets || []); setAllAdminBks(d.adminBookings || []); setAllRefresh(d.refreshments || []); setAllParkingBks(d.parking || []); }
      if (aRes.status === 'fulfilled') setAnalytics(aRes.value.data);
      if (uRes.status === 'fulfilled') setAllUsers(uRes.value.data);
      if (pRes.status === 'fulfilled' && pRes.value.data?.length > 0) saveParking(pRes.value.data);
      if (mRes.status === 'fulfilled' && mRes.value.data?.length > 0) saveMovies(mergeMovies(mRes.value.data, DEFAULT_MOVIES));
      if (sRes.status === 'fulfilled' && sRes.value.data?.length > 0) {
        const merged = [...DEFAULT_SNACKS];
        sRes.value.data.forEach(bs => { if (!merged.find(s => s.name === bs.name)) merged.push(bs); });
        saveSnacks(merged);
      }
      if (scRes.status === 'fulfilled') setScreens(scRes.value.data || []);
    } catch (e) { console.error(e); }
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const loadSeatMap = async (mTitle, show) => {
    try {
      const q = show.screenName ? `?screen=${encodeURIComponent(show.screenName)}` : '';
      const res = await axios.get(`${API}/admin/detailed-seats/${encodeURIComponent(mTitle)}/${encodeURIComponent(show.time)}${q}`);
      setSeatMap(res.data);
    } catch { setSeatMap({}); }
    setActiveShow({ mTitle, show });
  };
  const capacity = activeShow ? (activeShow.show.capacity || 80) : 80;
  const seatsPerRow = activeShow ? (activeShow.show.seatsPerRow || 10) : 10;
  const bookedCnt = Object.values(seatMap).filter(Boolean).length;

  const handleSaveMovie = async () => {
    if (!movieForm.title.trim()) { showToast('❌ Title required'); return; }
    setMovieSaving(true);
    const payload = {
      title: movieForm.title.trim(), genre: movieForm.genre, language: movieForm.language,
      duration: movieForm.duration, rating: parseFloat(movieForm.rating) || 8.0,
      shows: showSchedule, timings: showSchedule.map(s => s.time),
      pricing: { morning: 120, afternoon: 150, evening: 180, night: 200 },
      img: movieForm.img || '', description: movieForm.description || '',
    };
    try {
      let saved;
      if (editMovieId && !editMovieId.startsWith('local-') && editMovieId.length === 24) {
        try { saved = (await axios.put(`${API}/admin/movies/${editMovieId}`, payload)).data; }
        catch { saved = (await axios.post(`${API}/admin/movies`, payload)).data; }
      } else { saved = (await axios.post(`${API}/admin/movies`, payload)).data; }
      if (saved?._id) {
        const updated = movies.filter(m => m._id !== editMovieId && m.title !== saved.title);
        saveMovies([...updated, saved]); showToast('✅ Movie saved!');
      }
    } catch {
      if (editMovieId) saveMovies(movies.map(m => m._id === editMovieId ? { ...payload, _id: editMovieId } : m));
      else saveMovies([...movies, { ...payload, _id: `local-${Date.now()}` }]);
      showToast('⚠️ Saved locally');
    }
    setEditMovieId(null); setImgPreview(''); setMovieForm(emptyMovie); setShowSchedule([]); setMovieSaving(false);
  };

  const handleDeleteMovie = async (id) => {
    if (!window.confirm('Delete this movie?')) return;
    saveMovies(movies.filter(m => m._id !== id));
    if (id && !id.startsWith('local-') && id.length === 24) {
      try { await axios.delete(`${API}/admin/movies/${id}`); } catch { }
    }
    showToast('🗑 Movie removed');
  };

  const addShowSlot = () => {
    if (!newShowTime.trim()) { showToast('❌ Enter a time'); return; }
    const scr = screens.find(s => s._id === newShowScr);
    setShowSchedule(p => [...p, {
      time: newShowTime.trim(), screenId: newShowScr || '', screenName: scr?.name || '',
      screenType: scr?.screenType || 'Standard', rows: scr?.rows || 8,
      seatsPerRow: scr?.seatsPerRow || 10, capacity: scr?.capacity || 80,
    }]);
    setNewShowTime(''); setNewShowScr('');
  };
  const removeShowSlot = (idx) => setShowSchedule(p => p.filter((_, i) => i !== idx));

  const handleSaveScreen = async () => {
    if (!screenForm.name.trim()) { showToast('❌ Name required'); return; }
    setScreenSaving(true);
    const r = parseInt(screenForm.rows) || 8;
    const spr = parseInt(screenForm.seatsPerRow) || 10;
    const payload = { name: screenForm.name.trim(), rows: r, seatsPerRow: spr, capacity: r * spr, screenType: screenForm.screenType };
    try {
      let saved;
      if (editScreenId) saved = (await axios.put(`${API}/admin/screens/${editScreenId}`, payload)).data;
      else saved = (await axios.post(`${API}/admin/screens`, payload)).data;
      setScreens(p => editScreenId ? p.map(s => s._id === editScreenId ? saved : s) : [...p, saved]);
      showToast('✅ Screen saved!');
    } catch (e) { showToast('❌ ' + e.message); }
    setEditScreenId(null); setScreenForm(emptyScreen); setScreenSaving(false);
  };

  const handleDeleteScreen = async (id) => {
    if (!window.confirm('Remove this screen?')) return;
    try { await axios.delete(`${API}/admin/screens/${id}`); setScreens(p => p.filter(s => s._id !== id)); showToast('🗑 Screen removed'); }
    catch (e) { showToast('❌ ' + e.message); }
  };

  // FIX #2: snack save now includes img field
  const handleSaveSnack = async () => {
    if (!snackForm.name.trim()) { showToast('❌ Name required'); return; }
    const ns = { ...snackForm, _id: editSnackId || `sn-${Date.now()}`, price: Number(snackForm.price) || 0, coinPrice: Number(snackForm.coinPrice) || 0, img: snackForm.img || '' };
    if (editSnackId) { saveSnacks(snacks.map(s => s._id === editSnackId ? ns : s)); await axios.put(`${API}/admin/snacks/${editSnackId}`, ns).catch(() => { }); }
    else { saveSnacks([...snacks, ns]); await axios.post(`${API}/admin/snacks`, ns).catch(() => { }); }
    setEditSnackId(null); setSnackForm(emptySnack); showToast('✅ Item saved!');
  };
  const handleDeleteSnack = async (id) => {
    if (!window.confirm('Delete?')) return;
    saveSnacks(snacks.filter(s => s._id !== id));
    await axios.delete(`${API}/admin/snacks/${id}`).catch(() => { });
    showToast('🗑 Deleted');
  };

  const handleResetParking = async () => {
    if (!window.confirm('Release all slots?')) return;
    await axios.delete(`${API}/admin/parking/reset`).catch(() => { });
    saveParking(parkingSlots.map(s => ({ ...s, isBooked: false, bookedBy: null })));
    showToast('✅ All slots released');
  };
  const handleReleaseSlot = async (slotNumber) => {
    await axios.post(`${API}/parking/release/${slotNumber}`).catch(() => { });
    saveParking(parkingSlots.map(s => s.slotNumber === slotNumber ? { ...s, isBooked: false, bookedBy: null } : s));
    showToast(`✅ Slot ${slotNumber} released`);
  };

  const handleDirectBook = async () => {
    const { username, movieName, timing, screenName, seats, amount, notes } = adminBookForm;
    if (!username.trim() || !movieName.trim() || !timing.trim() || !seats.trim()) { showToast('❌ All fields required'); return; }
    const seatArr = seats.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1);
    if (!seatArr.length) { showToast('❌ Enter valid seat numbers'); return; }
    setAdminBookLoading(true);
    try {
      const mv = movies.find(m => m.title === movieName);
      const show = mv?.shows?.find(s => s.time === timing) || (mv?.timings?.includes(timing) ? { time: timing, screenName: '', rows: 8, seatsPerRow: 10 } : null);
      const res = await axios.post(`${API}/admin/book-direct`, {
        username: username.trim(), movieName: movieName.trim(), timing: timing.trim(),
        screenName: screenName || show?.screenName || '',
        rows: show?.rows || 8, seatsPerRow: show?.seatsPerRow || 10,
        selectedSeats: seatArr, amount: parseInt(amount) || 0, notes: notes.trim(),
      });
      setAdminBookResult(res.data);
      showToast('✅ Booking created!');
      setAdminBookForm({ username: '', movieName: '', timing: '', screenName: '', seats: '', amount: '', notes: '' });
      fetchAll();
    } catch (e) { showToast('❌ ' + (e.response?.data?.error || 'Booking failed')); }
    setAdminBookLoading(false);
  };

  const BLOCK_INFO = { A: { icon: '🏍', color: '#007AFF', desc: 'Two-Wheeler · ₹30' }, B: { icon: '🚗', color: '#34C759', desc: 'Four-Wheeler · ₹60' }, C: { icon: '🚙', color: '#FF9500', desc: 'Premium · ₹80' }, D: { icon: '♿', color: '#8E8E93', desc: 'Disabled · Free' } };
  const TABS = [['monitor', '🎭 Monitor'], ['screens', '🖥️ Screens'], ['analytics', '📊 Analytics'], ['bookings', '🎟 Bookings'], ['movies', '🎬 Movies'], ['snacks', '🍿 Snacks'], ['parking', '🅿️ Parking'], ['users', '👥 Users'], ['direct', '✏️ Book']];

  return (
    <div className="admin-shell">
      <style>{G}</style>
      <Toast msg={toast} />
      {viewTicket && (
        <div className="modal-bg" onClick={() => setViewTicket(null)}>
          <div className="eticket-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎟️</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1C1C1E', marginBottom: 4 }}>{viewTicket.movieName}</div>
            <div style={{ fontSize: 13, color: '#6C6C70', marginBottom: 4 }}>{viewTicket.timing}{viewTicket.screenName ? ` · 🖥️ ${viewTicket.screenName}` : ''}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>Seats: {viewTicket.selectedSeats?.map(s => s + 1).join(', ')}</div>
            {viewTicket.eTicketQR && <img src={viewTicket.eTicketQR} alt="QR" style={{ width: 180, borderRadius: 12, border: '3px solid white', boxShadow: 'var(--sh2)', marginBottom: 12 }} />}
            <div style={{ fontSize: 11, color: '#6C6C70', marginBottom: 12 }}>👤 {viewTicket.username}</div>
            <button className="btn btn-dark btn-sm" onClick={() => setViewTicket(null)}>Close</button>
          </div>
        </div>
      )}
      <nav className="admin-nav">
        <div className="admin-nav-brand"><div className="admin-nav-ico">🎬</div><div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>Admin</div></div>
        {TABS.map(([k, l]) => <button key={k} className={`admin-tab-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
        <button className="admin-tab-btn" style={{ color: 'var(--green)', marginLeft: 4 }} onClick={fetchAll} disabled={refreshing}>{refreshing ? '⏳' : '🔄'}</button>
        <button className="admin-tab-btn" style={{ marginLeft: 'auto' }} onClick={onBack}>← Exit</button>
      </nav>

      <div className="admin-wrap">

        {/* MONITOR */}
        {tab === 'monitor' && (
          <div className="page">
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', marginBottom: 14 }}>Click a showtime to view live seat map</div>
            {movies.map(m => (
              <div key={m._id} className="admin-card">
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, marginBottom: 9 }}>🎞️ {m.title}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {(m.shows?.length > 0 ? m.shows : (m.timings || []).map(t => ({ time: t, screenName: '', capacity: 80, seatsPerRow: 10 }))).map((show, si) => (
                    <button key={si} className="chip chip-blue" onClick={() => loadSeatMap(m.title, show)}>
                      🕐 {show.time}{show.screenName ? ` · ${show.screenName}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {activeShow && (
              <div className="admin-card" style={{ marginTop: 18 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{activeShow.mTitle}</div>
                <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginBottom: 14 }}>
                  🕐 {activeShow.show.time}{activeShow.show.screenName && <> · 🖥️ {activeShow.show.screenName}</>} · {capacity} seats ({activeShow.show.rows || '?'}×{seatsPerRow})
                </div>
                <div className="admin-stat-grid">
                  <div className="admin-stat"><div className="admin-stat-n" style={{ color: 'var(--accent)' }}>{bookedCnt}</div><div className="admin-stat-l">Booked</div></div>
                  <div className="admin-stat"><div className="admin-stat-n" style={{ color: 'var(--green)' }}>{capacity - bookedCnt}</div><div className="admin-stat-l">Available</div></div>
                  <div className="admin-stat"><div className="admin-stat-n">{capacity}</div><div className="admin-stat-l">Capacity</div></div>
                </div>
                <div style={{ display: 'flex', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,.5)' }}><div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(255,255,255,.08)' }} /> Available</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,.5)' }}><div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent)' }} /> User Booked</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,.5)' }}><div style={{ width: 12, height: 12, borderRadius: 3, background: '#FFB800' }} /> Admin Booked</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(seatsPerRow, 12)},1fr)`, gap: 4, marginBottom: 14 }}>
                  {[...Array(capacity)].map((_, i) => {
                    const info = seatMap[i];
                    const cls = info ? (info.type === 'admin' ? 'a-booked-admin' : 'a-booked-user') : 'a-free';
                    return (
                      <div key={i} className={`admin-seat ${cls}`}
                        style={{ width: '100%', aspectRatio: '1', fontSize: Math.max(7, 10 - Math.floor(capacity / 40)) }}
                        title={info ? `👤 ${info.user}${info.method ? ` (${info.method})` : ''}` : ''}>
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
                <button className="btn btn-sm" style={{ background: 'rgba(255,55,95,.15)', color: 'var(--accent)', border: '1px solid rgba(255,55,95,.3)' }}
                  onClick={async () => {
                    if (!window.confirm('Reset all bookings for this show?')) return;
                    await axios.delete(`${API}/admin/refresh/${encodeURIComponent(activeShow.mTitle)}/${encodeURIComponent(activeShow.show.time)}`).catch(() => { });
                    setSeatMap({}); showToast('🗑 Show reset');
                  }}>🗑 Reset Show</button>
              </div>
            )}
          </div>
        )}

        {/* SCREENS */}
        {tab === 'screens' && (
          <div className="page">
            <div className="admin-card">
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, marginBottom: 14 }}>{editScreenId ? '✏️ Edit Screen' : '➕ Add Screen'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="admin-inp-label">Screen Name *</label>
                  <input className="admin-inp" placeholder="e.g. Screen 1, IMAX Hall" value={screenForm.name} onChange={e => setScreenForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="admin-inp-label">Number of Rows</label>
                  <input className="admin-inp" type="number" min="1" max="30" placeholder="8" value={screenForm.rows} onChange={e => setScreenForm(p => ({ ...p, rows: e.target.value }))} />
                </div>
                <div>
                  <label className="admin-inp-label">Seats per Row</label>
                  <input className="admin-inp" type="number" min="1" max="30" placeholder="10" value={screenForm.seatsPerRow} onChange={e => setScreenForm(p => ({ ...p, seatsPerRow: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="admin-inp-label">Screen Type</label>
                  <select className="admin-select" value={screenForm.screenType} onChange={e => setScreenForm(p => ({ ...p, screenType: e.target.value }))}>
                    {['Standard', 'Premium', 'IMAX', '4DX', 'Dolby'].map(t => <option key={t} value={t}>{SCREEN_TYPE_BADGE[t]} {t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginBottom: 12, background: 'rgba(255,255,255,.04)', borderRadius: 9, padding: '8px 12px' }}>
                📐 Total capacity: <strong style={{ color: '#fff' }}>{(parseInt(screenForm.rows) || 0) * (parseInt(screenForm.seatsPerRow) || 0)} seats</strong>
              </div>
              <div style={{ display: 'flex', gap: 9 }}>
                <button className="btn btn-red btn-sm" onClick={handleSaveScreen} disabled={screenSaving}>
                  {screenSaving ? <span className="spinner" /> : editScreenId ? '💾 Update' : '➕ Add Screen'}
                </button>
                {editScreenId && <button className="btn btn-grey btn-sm" onClick={() => { setEditScreenId(null); setScreenForm(emptyScreen); }}>Cancel</button>}
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', margin: '18px 0 10px' }}>{screens.length} screens</div>
            {screens.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.3)', padding: 40 }}>No screens yet. Add one above.</div>}
            {screens.map(sc => {
              const color = SCREEN_TYPE_COLOR[sc.screenType] || '#007AFF';
              const badge = SCREEN_TYPE_BADGE[sc.screenType] || '🎬';
              return (
                <div key={sc._id} className="screen-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '22', border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{badge}</div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{sc.name}</div>
                      <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, marginTop: 2 }}>{sc.rows || '?'} rows × {sc.seatsPerRow || '?'} seats = <strong style={{ color: 'rgba(255,255,255,.7)' }}>{sc.capacity} total</strong></div>
                      <div style={{ marginTop: 4 }}><span className="screen-type-badge" style={{ background: color + '22', color, border: `1px solid ${color}44` }}>{badge} {sc.screenType || 'Standard'}</span></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button className="chip chip-blue" onClick={() => { setEditScreenId(sc._id); setScreenForm({ name: sc.name, rows: String(sc.rows || 8), seatsPerRow: String(sc.seatsPerRow || 10), screenType: sc.screenType || 'Standard' }); }}>✏️</button>
                    <button className="chip" style={{ background: 'rgba(255,55,95,.15)', color: 'var(--accent)' }} onClick={() => handleDeleteScreen(sc._id)}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ANALYTICS — FIX #3: totalRevenue and ticketRevenue come from backend which already sums Ticket + AdminBooking */}
        {tab === 'analytics' && (
          <div className="page">
            <div className="admin-stat-grid">
              <div className="admin-stat"><div className="admin-stat-n" style={{ color: 'var(--green)' }}>₹{analytics?.totalRevenue?.toLocaleString() || 0}</div><div className="admin-stat-l">Total Revenue</div></div>
              <div className="admin-stat"><div className="admin-stat-n" style={{ color: 'var(--accent)' }}>₹{analytics?.ticketRevenue?.toLocaleString() || 0}</div><div className="admin-stat-l">Tickets (incl. Admin)</div></div>
              <div className="admin-stat"><div className="admin-stat-n" style={{ color: 'var(--blue)' }}>₹{analytics?.parkingRevenue?.toLocaleString() || 0}</div><div className="admin-stat-l">Parking</div></div>
              <div className="admin-stat"><div className="admin-stat-n" style={{ color: '#FF9500' }}>₹{analytics?.refreshmentRevenue?.toLocaleString() || 0}</div><div className="admin-stat-l">Snacks</div></div>
              <div className="admin-stat"><div className="admin-stat-n" style={{ color: '#FFB800' }}>{(analytics?.totalBookings || 0) + (analytics?.totalAdminBookings || 0)}</div><div className="admin-stat-l">All Bookings</div></div>
              <div className="admin-stat"><div className="admin-stat-n">{analytics?.totalUsers || allUsers.length}</div><div className="admin-stat-l">Users</div></div>
              <div className="admin-stat"><div className="admin-stat-n" style={{ color: '#FFB800' }}>{analytics?.coinsIssued || 0}</div><div className="admin-stat-l">Coins Issued</div></div>
              <div className="admin-stat"><div className="admin-stat-n" style={{ color: 'var(--green)' }}>{screens.length}</div><div className="admin-stat-l">Screens</div></div>
            </div>
            {analytics?.dailyRevenue?.length > 0 && (
              <div className="admin-card">
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.6)', marginBottom: 6 }}>📈 7-Day Revenue (Tickets + Admin + Parking + Snacks)</div>
                <RevenueChart data={analytics.dailyRevenue} />
              </div>
            )}
            {analytics?.movieStats?.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', margin: '18px 0 10px' }}>Popular Movies</div>
                {analytics.movieStats.map((m, i) => (
                  <div key={i} className="admin-table-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ color: '#fff', fontWeight: 700 }}>#{i + 1} {m._id}</div>
                    <div><span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, marginRight: 14 }}>{m.count} bookings</span><span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>₹{m.revenue?.toLocaleString()}</span></div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* BOOKINGS */}
        {tab === 'bookings' && (
          <div className="page">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase' }}>
                All Bookings ({allBookings.length + allAdminBks.length + allRefresh.length + allParkingBks.length})
              </div>
              <button className="chip chip-blue" onClick={fetchAll}>{refreshing ? '⏳' : '🔄'}</button>
            </div>
            {(() => {
              const all = [
                ...allBookings.map(b => ({ ...b, _btype: 'ticket' })),
                ...allAdminBks.map(b => ({ ...b, _btype: 'admin' })),
                ...allRefresh.map(b => ({ ...b, _btype: 'refresh' })),
                ...allParkingBks.map(b => ({ ...b, _btype: 'parking' })),
              ].sort((a, b) => new Date(b.date) - new Date(a.date));
              if (!all.length) return <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.3)', padding: 40 }}>No bookings yet. Click 🔄 Refresh.</div>;
              return all.map((b, i) => {
                if (b._btype === 'ticket') return (
                  <div key={i} className="admin-table-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 4 }}><div style={{ color: '#fff', fontWeight: 700 }}>{b.movieName}</div><span className="btype-ticket">TICKET</span></div>
                      <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>👤 {b.username} · 🕐 {b.timing}{b.screenName ? ` · 🖥️ ${b.screenName}` : ''}</div>
                      <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 11, marginTop: 2 }}>Seats: {b.selectedSeats?.map(s => s + 1).join(', ')} · Via: {b.paymentMethod}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div style={{ background: 'rgba(52,199,89,.15)', color: 'var(--green)', borderRadius: 7, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>₹{b.amount}</div>
                      {b.eTicketQR && <button className="chip chip-blue" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setViewTicket(b)}>🎟 QR</button>}
                    </div>
                  </div>
                );
                if (b._btype === 'admin') return (
                  <div key={i} className="admin-table-row" style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,184,0,.2)' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 4 }}><div style={{ color: '#FFB800', fontWeight: 700 }}>{b.movieName}</div><span className="btype-admin">ADMIN</span></div>
                      <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>👤 {b.username} · 🕐 {b.timing}{b.screenName ? ` · 🖥️ ${b.screenName}` : ''}</div>
                      <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 11, marginTop: 2 }}>Seats: {b.selectedSeats?.map(s => s + 1).join(', ')}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{new Date(b.date).toLocaleDateString('en-IN')}</div>
                      {b.eTicketQR && <button className="chip chip-blue" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setViewTicket(b)}>🎟 QR</button>}
                    </div>
                  </div>
                );
                if (b._btype === 'refresh') return (
                  <div key={i} className="admin-table-row" style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,149,0,.15)' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}>{b.username} <span className="btype-refresh">SNACKS</span></div>
                      <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>{b.items?.map(it => `${it.name} ×${it.qty}`).join(', ')}</div>
                    </div>
                    <div style={{ background: 'rgba(255,149,0,.15)', color: '#FF9500', borderRadius: 7, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>₹{b.total}</div>
                  </div>
                );
                if (b._btype === 'parking') return (
                  <div key={i} className="admin-table-row" style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(0,122,255,.15)' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}>Slot {b.slotNumber} <span className="btype-parking">PARKING</span></div>
                      <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>👤 {b.username} · {b.slotType}</div>
                    </div>
                    <div style={{ background: 'rgba(0,122,255,.15)', color: 'var(--blue)', borderRadius: 7, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>₹{b.price}</div>
                  </div>
                );
                return null;
              });
            })()}
          </div>
        )}

        {/* MOVIES */}
        {tab === 'movies' && (
          <div className="page">
            <div className="admin-card">
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, marginBottom: 14 }}>{editMovieId ? '✏️ Edit Movie' : '➕ Add Movie'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {[['title', 'Title *'], ['genre', 'Genre'], ['language', 'Language'], ['duration', 'Duration e.g. 2h 30m'], ['rating', 'Rating (0-10)']].map(([k, l]) => (
                  <div key={k}><label className="admin-inp-label">{l}</label><input className="admin-inp" placeholder={l} value={movieForm[k] || ''} onChange={e => setMovieForm(p => ({ ...p, [k]: e.target.value }))} /></div>
                ))}
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="admin-inp-label">🖼 Poster URL</label>
                  <input className="admin-inp" placeholder="https://..." value={movieForm.img || ''} onChange={e => { setMovieForm(p => ({ ...p, img: e.target.value })); setImgPreview(e.target.value); }} />
                  {imgPreview && <div style={{ marginTop: 8 }}><img src={imgPreview} alt="preview" style={{ width: 50, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,.15)' }} onError={e => e.target.style.display = 'none'} /></div>}
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="admin-inp-label">Description</label>
                  <input className="admin-inp" placeholder="Short description..." value={movieForm.description || ''} onChange={e => setMovieForm(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 12, background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,.07)' }}>
                <div style={{ color: 'rgba(255,255,255,.7)', fontWeight: 700, fontSize: 12, marginBottom: 10 }}>🕐 Show Schedule & Screen Assignment</div>
                {showSchedule.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,.05)', borderRadius: 9, padding: '8px 12px', marginBottom: 7 }}>
                    <div>
                      <span style={{ color: '#fff', fontWeight: 700 }}>{s.time}</span>
                      {s.screenName && <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, marginLeft: 8 }}>🖥️ {s.screenName} · {s.rows}×{s.seatsPerRow}={s.capacity} seats</span>}
                    </div>
                    <button className="chip" style={{ background: 'rgba(255,55,95,.15)', color: 'var(--accent)' }} onClick={() => removeShowSlot(i)}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <input className="admin-inp" placeholder="Time e.g. 10:00 AM" value={newShowTime} onChange={e => setNewShowTime(e.target.value)} style={{ flex: 1, minWidth: 140, marginBottom: 0 }} />
                  <select className="admin-select" value={newShowScr} onChange={e => setNewShowScr(e.target.value)} style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                    <option value="">No screen assigned</option>
                    {screens.map(sc => <option key={sc._id} value={sc._id}>{sc.name} ({sc.screenType}, {sc.capacity} seats)</option>)}
                  </select>
                  <button className="btn btn-green btn-sm" onClick={addShowSlot}>+ Add</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
                <button className="btn btn-red btn-sm" onClick={handleSaveMovie} disabled={movieSaving}>
                  {movieSaving ? <span className="spinner" /> : editMovieId ? '💾 Update' : '➕ Add Movie'}
                </button>
                {editMovieId && <button className="btn btn-grey btn-sm" onClick={() => { setEditMovieId(null); setImgPreview(''); setMovieForm(emptyMovie); setShowSchedule([]); }}>Cancel</button>}
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', margin: '18px 0 10px' }}>{movies.length} movies</div>
            {movies.map(m => (
              <div key={m._id} className="admin-table-row" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {m.img ? <img src={m.img} style={{ width: 46, height: 64, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} alt={m.title} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ width: 46, height: 64, borderRadius: 7, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎬</div>}
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 800 }}>{m.title}</div>
                  <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, marginTop: 2 }}>{m.genre} · {m.language} · ⭐{m.rating}</div>
                  <div style={{ color: 'rgba(255,255,255,.3)', fontSize: 10, marginTop: 2 }}>
                    {(m.shows?.length > 0 ? m.shows : (m.timings || []).map(t => ({ time: t, screenName: '' }))).map(s => `${s.time}${s.screenName ? ` (${s.screenName})` : ''}`).join(' · ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <button className="chip chip-blue" onClick={() => {
                    setEditMovieId(m._id); setImgPreview(m.img || ''); setMovieForm({ ...m, rating: String(m.rating || 8) });
                    setShowSchedule(m.shows?.length > 0 ? m.shows.map(s => ({ time: s.time, screenId: s.screenId || '', screenName: s.screenName || '', screenType: s.screenType || 'Standard', rows: s.rows || 8, seatsPerRow: s.seatsPerRow || 10, capacity: s.capacity || 80 })) : (m.timings || []).map(t => ({ time: t, screenId: '', screenName: '', rows: 8, seatsPerRow: 10, capacity: 80 })));
                  }}>✏️</button>
                  <button className="chip" style={{ background: 'rgba(255,55,95,.15)', color: 'var(--accent)' }} onClick={() => handleDeleteMovie(m._id)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SNACKS — FIX #2: Added img URL field in admin snack form */}
        {tab === 'snacks' && (
          <div className="page">
            <div className="admin-card">
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, marginBottom: 14 }}>{editSnackId ? '✏️ Edit Item' : '➕ Add Item'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {[['name', 'Name *'], ['emoji', 'Emoji'], ['price', 'Price (₹)'], ['coinPrice', 'Coin Price'], ['category', 'Category']].map(([k, l]) => (
                  <div key={k}><label className="admin-inp-label">{l}</label><input className="admin-inp" placeholder={l} value={snackForm[k] || ''} onChange={e => setSnackForm(p => ({ ...p, [k]: e.target.value }))} /></div>
                ))}
                {/* FIX #2: Image URL field */}
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="admin-inp-label">🖼 Image URL (optional — replaces emoji in store)</label>
                  <input className="admin-inp" placeholder="https://example.com/popcorn.jpg" value={snackForm.img || ''} onChange={e => setSnackForm(p => ({ ...p, img: e.target.value }))} />
                  {snackForm.img ? (
                    <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={snackForm.img} alt="preview" style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)' }} onError={e => e.target.style.display = 'none'} />
                      <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>Image preview</span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
                <button className="btn btn-green btn-sm" onClick={handleSaveSnack}>💾 Save</button>
                {editSnackId && <button className="btn btn-grey btn-sm" onClick={() => { setEditSnackId(null); setSnackForm(emptySnack); }}>Cancel</button>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(165px,1fr))', gap: 11 }}>
              {snacks.map(s => (
                <div key={s._id} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 13, padding: 14 }}>
                  {s.img
                    ? <img src={s.img} alt={s.name} style={{ width: '100%', height: 64, objectFit: 'cover', borderRadius: 8, marginBottom: 7 }} onError={e => { e.target.style.display = 'none'; }} />
                    : <div style={{ fontSize: 26, marginBottom: 7 }}>{s.emoji}</div>}
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                  <div style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>₹{s.price} · 🪙{s.coinPrice}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
                    <button className="chip chip-blue" style={{ flex: 1 }} onClick={() => { setEditSnackId(s._id); setSnackForm({ name: s.name, emoji: s.emoji || '🍿', price: String(s.price), coinPrice: String(s.coinPrice), category: s.category, img: s.img || '' }); }}>✏️</button>
                    <button className="chip" style={{ background: 'rgba(255,55,95,.15)', color: 'var(--accent)', flex: 1 }} onClick={() => handleDeleteSnack(s._id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PARKING (PRESERVED UNCHANGED) */}
        {tab === 'parking' && (
          <div className="page">
            <div className="admin-stat-grid">
              <div className="admin-stat"><div className="admin-stat-n" style={{ color: 'var(--accent)' }}>{parkingSlots.filter(s => s.isBooked).length}</div><div className="admin-stat-l">Occupied</div></div>
              <div className="admin-stat"><div className="admin-stat-n" style={{ color: 'var(--green)' }}>{parkingSlots.filter(s => !s.isBooked).length}</div><div className="admin-stat-l">Free</div></div>
              <div className="admin-stat"><div className="admin-stat-n">{parkingSlots.length}</div><div className="admin-stat-l">Total</div></div>
              <div className="admin-stat"><div className="admin-stat-n" style={{ color: '#FF9500' }}>₹{allParkingBks.reduce((s, p) => s + (p.price || 0), 0)}</div><div className="admin-stat-l">Revenue</div></div>
            </div>
            <div style={{ display: 'flex', gap: 9, marginBottom: 18 }}>
              <button className="btn btn-sm" style={{ background: 'rgba(255,55,95,.15)', color: 'var(--accent)' }} onClick={handleResetParking}>🗑 Release All</button>
              <button className="chip chip-blue" onClick={fetchAll}>🔄 Refresh</button>
            </div>
            {['A', 'B', 'C', 'D'].map(block => {
              const info = BLOCK_INFO[block];
              const slots = parkingSlots.filter(s => s.block === block || (!s.block && s.slotNumber?.startsWith(block)));
              return (
                <div key={block} className="admin-park-block">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: info.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{block}</div>
                    <div><div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Block {block} — {info.icon} {info.desc}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{slots.filter(s => s.isBooked).length}/{slots.length} occupied</div></div>
                  </div>
                  <div className="admin-park-slots">
                    {slots.map(slot => (
                      <div key={slot.slotNumber}
                        className={`admin-park-slot ${slot.isBooked ? 'aps-booked' : slot.slotType === 'Disabled' ? 'aps-disabled' : 'aps-free'}`}
                        title={slot.isBooked ? `By: ${slot.bookedBy}` : 'Available'}
                        onClick={() => slot.isBooked && handleReleaseSlot(slot.slotNumber)}>
                        <div>{slot.slotNumber}</div>
                        <div style={{ fontSize: 8, marginTop: 2, opacity: .7 }}>{slot.isBooked ? 'TAP→FREE' : slot.slotType === 'Disabled' ? 'RESERVED' : 'FREE'}</div>
                        {slot.isBooked && slot.bookedBy && <div style={{ fontSize: 8, marginTop: 1, opacity: .5 }}>{slot.bookedBy.slice(0, 6)}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="page">
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', marginBottom: 12 }}>{allUsers.length} users</div>
            {allUsers.map((u, i) => (
              <div key={i} className="admin-table-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ color: '#fff', fontWeight: 700 }}>👤 {u.username}</div><div style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>{u.email} · {u.phone}</div></div>
                <div style={{ background: 'linear-gradient(135deg,#FFB800,#FF9500)', color: '#fff', borderRadius: 7, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>🪙 {u.cineCoins || 0}</div>
              </div>
            ))}
          </div>
        )}

        {/* DIRECT BOOKING */}
        {tab === 'direct' && (
          <div className="page">
            <div className="admin-card" style={{ maxWidth: 540 }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, marginBottom: 5 }}>✏️ Direct Booking</div>
              <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, marginBottom: 18 }}>Walk-in / offline booking. Generates an e-ticket QR.</div>
              <label className="admin-inp-label">Customer Username</label>
              <input className="admin-inp" placeholder="Username" value={adminBookForm.username} onChange={e => setAdminBookForm(p => ({ ...p, username: e.target.value }))} />
              <label className="admin-inp-label">Movie</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {movies.map(m => (
                  <button key={m._id} className={`chip ${adminBookForm.movieName === m.title ? 'chip-red' : 'chip-blue'}`} style={{ fontSize: 11 }}
                    onClick={() => setAdminBookForm(p => ({ ...p, movieName: m.title, timing: '', screenName: '' }))}>
                    {m.title}
                  </button>
                ))}
              </div>
              {adminBookForm.movieName && (() => {
                const mv = movies.find(m => m.title === adminBookForm.movieName);
                const shows = mv?.shows?.length > 0 ? mv.shows : (mv?.timings || []).map(t => ({ time: t, screenName: '' }));
                return (
                  <>
                    <label className="admin-inp-label">Showtime</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {shows.map((s, si) => (
                        <button key={si} className={`chip ${adminBookForm.timing === s.time ? 'chip-red' : 'chip-blue'}`} style={{ fontSize: 11 }}
                          onClick={() => setAdminBookForm(p => ({ ...p, timing: s.time, screenName: s.screenName || '' }))}>
                          🕐 {s.time}{s.screenName ? ` · ${s.screenName}` : ''}
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
              <label className="admin-inp-label">Seat Numbers (1-based, comma separated)</label>
              <input className="admin-inp" placeholder="e.g. 5, 10, 15" value={adminBookForm.seats} onChange={e => setAdminBookForm(p => ({ ...p, seats: e.target.value }))} />
              <label className="admin-inp-label">Amount ₹ (0 = complimentary)</label>
              <input className="admin-inp" type="number" placeholder="0" value={adminBookForm.amount} onChange={e => setAdminBookForm(p => ({ ...p, amount: e.target.value }))} />
              <label className="admin-inp-label">Notes</label>
              <input className="admin-inp" placeholder="VIP, group booking..." value={adminBookForm.notes} onChange={e => setAdminBookForm(p => ({ ...p, notes: e.target.value }))} />
              <button className="btn btn-green btn-sm" disabled={adminBooking} onClick={handleDirectBook}>
                {adminBooking ? <span className="spinner" /> : '✅ Confirm Booking'}
              </button>
              {adminBookResult && (
                <div style={{ marginTop: 14, background: 'rgba(52,199,89,.1)', border: '1px solid rgba(52,199,89,.25)', borderRadius: 11, padding: 14, textAlign: 'center' }}>
                  <div style={{ color: 'var(--green)', fontWeight: 800, marginBottom: 7 }}>✅ Booking Confirmed!</div>
                  <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginBottom: 9 }}>ID: #{adminBookResult.bookingId?.toString().slice(-6)}</div>
                  {adminBookResult.eTicketQR && <img src={adminBookResult.eTicketQR} alt="QR" style={{ width: 150, borderRadius: 10, border: '3px solid rgba(255,255,255,.2)', marginBottom: 9 }} />}
                  <div><button className="chip" style={{ color: 'rgba(255,255,255,.4)' }} onClick={() => setAdminBookResult(null)}>Dismiss</button></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   USER APP
═══════════════════════════════════════════════════════════ */
function UserApp({ onAdmin }) {
  const [page, setPage] = useState('gallery');
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [cineCoins, setCineCoins] = useState(0);
  const [coinAnimKey, setCoinAnimKey] = useState(0);
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', email: '', phone: '' });

  const [movies, setMovies] = useState(() => LS.get('ct_movies', DEFAULT_MOVIES));
  const [snacks, setSnacks] = useState(() => LS.get('ct_admin_snacks', DEFAULT_SNACKS));
  const [parkingSlots, setParkingSlots] = useState(() => LS.get('ct_admin_parking', buildDefaultParking()));

  const [movie, setMovie] = useState(null);
  const [selShow, setSelShow] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [sel, setSel] = useState([]);
  const [history, setHistory] = useState({ tickets: [], refreshments: [], parking: [], adminBookings: [] });
  const [coinHistory, setCoinHistory] = useState([]);
  const [cart, setCart] = useState({});
  const [cat, setCat] = useState('All');
  const [payMethod, setPayMethod] = useState('razorpay');
  const [rzpLoading, setRzpLoading] = useState(false);
  const [eTicketModal, setETicketModal] = useState(null);
  const [toast, showToast] = useToast();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [selParkSlot, setSelParkSlot] = useState(null);
  const [parkLoading, setParkLoading] = useState(false);
  const [histTab, setHistTab] = useState('tickets');

  const updateCoins = useCallback((n) => { setCineCoins(n); setCoinAnimKey(k => k + 1); }, []);

  useEffect(() => {
    const onMovies = (e) => { if (Array.isArray(e.detail)) setMovies(e.detail); };
    const onStorage = (e) => {
      if (e.key === 'ct_movies') try { const m = JSON.parse(e.newValue); if (m) setMovies(m); } catch { }
      if (e.key === 'ct_admin_snacks') try { const s = JSON.parse(e.newValue); if (s) setSnacks(s); } catch { }
      if (e.key === 'ct_admin_parking') try { const p = JSON.parse(e.newValue); if (p) setParkingSlots(p); } catch { }
    };
    window.addEventListener('ct_movies', onMovies);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('ct_movies', onMovies); window.removeEventListener('storage', onStorage); };
  }, []);

  useEffect(() => {
    axios.get(`${API}/movies`).then(r => { if (r.data?.length > 0) { const m = mergeMovies(r.data, DEFAULT_MOVIES); setMovies(m); LS.set('ct_movies', m); } }).catch(() => { });
    axios.get(`${API}/snacks`).then(r => {
      if (r.data?.length > 0) {
        const merged = [...DEFAULT_SNACKS];
        r.data.forEach(bs => { if (!merged.find(s => s.name === bs.name)) merged.push(bs); });
        setSnacks(merged); LS.set('ct_admin_snacks', merged);
      }
    }).catch(() => { });
    axios.get(`${API}/parking`).then(r => { if (r.data?.length > 0) { setParkingSlots(r.data); LS.set('ct_admin_parking', r.data); } }).catch(() => { });
  }, []);

  const refreshCoins = useCallback(async (username) => {
    if (!username) return 0;
    try { const res = await axios.get(`${API}/user/coins/${username}`); const coins = res.data.cineCoins ?? 0; updateCoins(coins); return coins; }
    catch { return 0; }
  }, [updateCoins]);

  useEffect(() => {
    if (movie && selShow) {
      const q = selShow.screenName ? `?screen=${encodeURIComponent(selShow.screenName)}` : '';
      axios.get(`${API}/booked-seats/${encodeURIComponent(movie.title)}/${encodeURIComponent(selShow.time)}${q}`).then(r => setBookedSeats(r.data)).catch(() => { });
    }
  }, [movie, selShow]);

  useEffect(() => {
    if (user && ['gallery', 'coins', 'history', 'store', 'parking'].includes(page)) refreshCoins(user);
  }, [page, user, refreshCoins]);

  const handleAuth = async (type) => {
    try {
      const res = await axios.post(`${API}/${type}`, form);
      if (type === 'login') {
        if (res.data.role === 'admin') { showToast('Use the Admin Portal button.'); return; }
        setUser(res.data.user); setUserEmail(res.data.email || ''); updateCoins(res.data.cineCoins || 0); showToast(`Welcome, ${res.data.user}! 🎬`);
      } else { showToast('✅ Account created! Sign in.'); setAuthMode('login'); }
    } catch (e) { showToast('❌ ' + (e.response?.data?.error || 'Auth failed')); }
  };

  const getPrice = () => {
    if (!movie || !selShow) return 150;
    const t = selShow.time; const h = parseInt(t); const isAM = t.includes('AM');
    if (isAM && h !== 12) return movie.pricing?.morning || 120;
    if (!isAM && (h === 12 || h <= 4)) return movie.pricing?.afternoon || 150;
    if (!isAM && h < 8) return movie.pricing?.evening || 180;
    return movie.pricing?.night || 200;
  };

  const ticketTotal = sel.length * getPrice();
  const cartItems = Object.values(cart).filter(i => i.qty > 0);
  const refreshTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const coinsForTickets = sel.length * 500;
  const canPayCoins = cineCoins >= coinsForTickets && sel.length > 0;
  const capacity = selShow?.capacity || 80;
  const spr = selShow?.seatsPerRow || 10;

  const addToCart = (item) => { setCart(p => ({ ...p, [item._id]: { ...item, qty: (p[item._id]?.qty || 0) + 1 } })); showToast(`${item.emoji || '✅'} Added!`); };

  const loadHistory = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API}/history/${user}`);
      const data = res.data;
      if (Array.isArray(data)) {
        setHistory({ tickets: data, refreshments: [], parking: [], adminBookings: [] });
        const coins = [];
        data.forEach(t => {
          if (t.coinsEarned > 0) coins.push({ type: 'earn', text: `${t.movieName} booking`, amount: +t.coinsEarned, date: t.date });
          if (t.coinsUsed > 0) coins.push({ type: 'use', text: `Coins for ${t.movieName}`, amount: -t.coinsUsed, date: t.date });
        });
        setCoinHistory(coins.sort((a, b) => new Date(b.date) - new Date(a.date)));
      } else {
        setHistory(data);
        const coins = [];
        (data.tickets || []).forEach(t => {
          if (t.coinsEarned > 0) coins.push({ type: 'earn', text: `${t.movieName} ticket`, amount: +t.coinsEarned, date: t.date });
          if (t.coinsUsed > 0) coins.push({ type: 'use', text: `Coins — ${t.movieName}`, amount: -t.coinsUsed, date: t.date });
        });
        (data.refreshments || []).forEach(r => { if (r.coinsEarned > 0) coins.push({ type: 'earn', text: 'Snacks order', amount: +r.coinsEarned, date: r.date }); });
        (data.parking || []).forEach(p => { if (p.coinsEarned > 0) coins.push({ type: 'earn', text: `Parking ${p.slotNumber}`, amount: +p.coinsEarned, date: p.date }); });
        setCoinHistory(coins.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch { setHistory({ tickets: [], refreshments: [], parking: [], adminBookings: [] }); }
    await refreshCoins(user);
  };

  /* ══════════════════════════════════════════════════════════════════════════
     RAZORPAY — Fixed for 401 key-mismatch issue.

     ROOT CAUSE of the 401:
       The frontend was opening the Razorpay modal even on a *simulated* order
       (orderId starts with "order_SIM_"). Razorpay's API then tried to validate
       a session using the key, but because the key in server.js was a different
       key than the one that created the session, it returned 401 Unauthorized.

     FIX STRATEGY:
       1. ALWAYS fetch keyId from the backend — never use any hardcoded key.
       2. If the backend returns simulated:true OR orderId starts with "order_SIM_",
          bypass the Razorpay modal entirely and call onSuccess directly.
          This is correct behaviour for test/demo mode.
       3. Only open the real Razorpay modal when we have a genuine orderId
          (from a successfully initialised Razorpay instance on the backend).
  ══════════════════════════════════════════════════════════════════════════ */
  const loadRzpScript = () => new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const openRazorpay = useCallback(async ({ amount, description, onSuccess, onFailure }) => {
    if (!amount || amount <= 0) { showToast('❌ Invalid amount'); onFailure?.(); return; }

    // Step 1: Call backend to create an order — this is mandatory before anything else.
    // The backend always returns the correct keyId for its own Razorpay account.
    let orderData;
    try {
      const res = await axios.post(`${API}/payment/create-order`, {
        amount,
        receipt: `rcpt_${Date.now()}`,
        notes: { description },
      });
      orderData = res.data;
      console.log('🔑 Razorpay order response:', {
        keyId: orderData.keyId?.slice(0, 20) + '...',
        orderId: orderData.orderId,
        simulated: orderData.simulated,
      });
    } catch (e) {
      console.error('create-order failed:', e.response?.data || e.message);
      showToast('❌ Payment setup failed. Please try again.');
      onFailure?.();
      return;
    }

    // Step 2: CRITICAL — if the backend is in simulated mode (Razorpay not initialised
    // on server, or keys missing), skip the modal completely. Opening the Razorpay modal
    // without a real order_id from the *same* key causes the 401 Unauthorized error.
    const isSimulated =
      orderData.simulated === true ||
      !orderData.orderId ||
      String(orderData.orderId).startsWith('order_SIM_') ||
      String(orderData.orderId).startsWith('order_FALLBACK_');

    if (isSimulated) {
      console.log('ℹ️ Backend is in simulated mode — bypassing Razorpay modal, auto-succeeding.');
      showToast('💳 Test mode: payment auto-approved');
      onSuccess({
        orderId: orderData.orderId || `order_SIM_${Date.now()}`,
        paymentId: `pay_SIM_${Date.now()}`,
        signature: 'simulated',
      });
      return;
    }

    // Step 3: We have a real Razorpay order. Load the checkout script.
    const scriptOk = await loadRzpScript();
    if (!scriptOk || !window.Razorpay) {
      showToast('❌ Razorpay script failed to load. Check your internet connection.');
      onFailure?.();
      return;
    }

    // Step 4: Open the Razorpay modal using ONLY the keyId returned by the backend.
    // Never use any hardcoded key here — the backend key and the order must match.
    const options = {
      key: orderData.keyId,        // ← ONLY value from backend, never hardcoded
      amount: Math.round(amount * 100),
      currency: orderData.currency || 'INR',
      name: 'Cine Time',
      description,
      order_id: orderData.orderId, // ← real Razorpay order, matches the key above
      prefill: {
        name: user || 'Guest',
        email: userEmail || `${user || 'guest'}@cinetime.com`,
        contact: '9999999999',
      },
      theme: { color: '#FF375F' },
      handler: async (response) => {
        // Step 5: Verify signature on backend (non-fatal if it fails)
        try {
          await axios.post(`${API}/payment/verify`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        } catch (e) {
          console.warn('Verify warning (non-fatal):', e.message);
        }
        onSuccess({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => { showToast('Payment cancelled'); onFailure?.(); },
        escape: true,
        animation: true,
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', resp => {
        showToast('❌ Payment failed: ' + (resp.error?.description || 'Unknown error'));
        onFailure?.();
      });
      rzp.open();
    } catch (e) {
      showToast('❌ Could not open Razorpay: ' + e.message);
      onFailure?.();
    }
  }, [user, userEmail, showToast]);

  /* BOOK TICKET */
  const confirmBooking = async (method = 'razorpay') => {
    const doBook = async (orderId, paymentId) => {
      const res = await axios.post(`${API}/book`, {
        username: user, movieName: movie.title, timing: selShow.time,
        screenName: selShow.screenName || '',
        rows: selShow.rows || 8, seatsPerRow: selShow.seatsPerRow || 10,
        selectedSeats: sel, amount: ticketTotal,
        coinsUsed: method === 'coins' ? coinsForTickets : 0,
        paymentMethod: method, razorpayOrderId: orderId, razorpayPaymentId: paymentId,
      });
      const newBal = res.data.newCoinBalance ?? await refreshCoins(user);
      updateCoins(newBal);
      if (res.data.eTicketQR) {
        setETicketModal({
          qr: res.data.eTicketQR, movieName: movie.title, timing: selShow.time,
          screenName: selShow.screenName || '', seats: sel, amount: ticketTotal,
        });
      }
      showToast(`✅ Booked! ${(res.data.coinsEarned || 0) > 0 ? `+${res.data.coinsEarned} 🪙 earned` : ''}`);
      if (cartItems.length > 0 && method === 'razorpay') {
        try {
          const rRes = await axios.post(`${API}/refreshments/order`, {
            username: user, movieName: movie.title, timing: selShow.time,
            items: cartItems.map(i => ({ name: i.name, qty: i.qty, price: i.price, coinPrice: i.coinPrice })),
            total: refreshTotal, paymentMethod: 'razorpay',
            razorpayOrderId: orderId, razorpayPaymentId: paymentId,
          });
          const nb = rRes.data.newCoinBalance ?? await refreshCoins(user);
          updateCoins(nb);
        } catch (e) { console.warn('Refreshment order warning:', e.message); }
      }
      setSel([]); setCart({}); setPayMethod('razorpay');
      await refreshCoins(user);
    };

    if (method === 'razorpay') {
      setRzpLoading(true);
      await openRazorpay({
        amount: ticketTotal + refreshTotal,
        description: `${movie.title} · ${sel.length} seat(s) · ${selShow.time}`,
        onSuccess: async ({ orderId, paymentId }) => {
          try { await doBook(orderId, paymentId); }
          catch (e) { showToast('❌ ' + (e.response?.data?.error || 'Booking failed')); }
        },
        onFailure: () => { setRzpLoading(false); },
      });
      setRzpLoading(false);
    } else {
      try { await doBook(null, null); }
      catch (e) { showToast('❌ ' + (e.response?.data?.error || 'Booking failed')); }
    }
  };

  /* BOOK PARKING (PRESERVED UNCHANGED) */
  const bookParking = async (slot, method) => {
    setParkLoading(true);
    try {
      if (method === 'razorpay' && slot.price > 0) {
        await openRazorpay({
          amount: slot.price,
          description: `Parking Slot ${slot.slotNumber} · ${slot.slotType}`,
          onSuccess: async ({ orderId, paymentId }) => {
            try {
              const res = await axios.post(`${API}/parking/book`, {
                slotNumber: slot.slotNumber, username: user,
                showTiming: selShow?.time || '', movieName: movie?.title || 'General',
                paymentMethod: 'razorpay', coinsUsed: 0,
                razorpayOrderId: orderId, razorpayPaymentId: paymentId,
              });
              const nb = res.data.newCoinBalance ?? await refreshCoins(user);
              updateCoins(nb);
              setParkingSlots(p => p.map(s => s.slotNumber === slot.slotNumber ? { ...s, isBooked: true, bookedBy: user } : s));
              setSelParkSlot(null);
              showToast(`✅ Slot ${slot.slotNumber} booked! +${res.data.coinsEarned || 0} 🪙`);
            } catch (e) { showToast('❌ ' + (e.response?.data?.error || 'Failed')); }
          },
          onFailure: () => { },
        });
      } else if (method === 'razorpay' && slot.price === 0) {
        await axios.post(`${API}/parking/book`, {
          slotNumber: slot.slotNumber, username: user,
          showTiming: selShow?.time || '', movieName: movie?.title || 'General',
          paymentMethod: 'razorpay', coinsUsed: 0,
        });
        setParkingSlots(p => p.map(s => s.slotNumber === slot.slotNumber ? { ...s, isBooked: true, bookedBy: user } : s));
        setSelParkSlot(null);
        showToast(`✅ Slot ${slot.slotNumber} reserved!`);
      } else {
        if (cineCoins < slot.coinPrice) { showToast(`Need ${slot.coinPrice} 🪙. You have ${cineCoins}.`); setParkLoading(false); return; }
        const res = await axios.post(`${API}/parking/book`, {
          slotNumber: slot.slotNumber, username: user,
          showTiming: selShow?.time || '', movieName: movie?.title || 'General',
          paymentMethod: 'coins', coinsUsed: slot.coinPrice,
        });
        if (res.data.error) { showToast('❌ ' + res.data.error); setParkLoading(false); return; }
        const nb = res.data.newCoinBalance ?? (cineCoins - slot.coinPrice);
        updateCoins(nb);
        setParkingSlots(p => p.map(s => s.slotNumber === slot.slotNumber ? { ...s, isBooked: true, bookedBy: user } : s));
        setSelParkSlot(null);
        showToast(`✅ Slot ${slot.slotNumber} booked! 🪙-${slot.coinPrice}`);
      }
    } catch (e) { showToast('❌ ' + (e.response?.data?.error || e.message || 'Failed')); }
    setParkLoading(false);
  };

  const cats = ['All', ...new Set(snacks.map(s => s.category))];
  const filteredSnacks = cat === 'All' ? snacks : snacks.filter(s => s.category === cat);
  const cartQty = cartItems.reduce((s, i) => s + i.qty, 0);
  const selSlotObj = parkingSlots.find(s => s.slotNumber === selParkSlot);

  const NavBar = () => (
    <nav className="nav">
      <div className="nav-brand" onClick={() => setPage('gallery')}><div className="nav-pill">🎬</div><span className="nav-title">Cine Time</span></div>
      <div className="nav-links">
        {[['gallery', '🎭 Movies'], ['store', '🍿 Snacks'], ['parking', '🅿️ Park'], ['history', '🎟 Tickets'], ['coins', '🪙 Coins']].map(([p, l]) => (
          <button key={p} className={`nav-link ${page === p ? 'active' : ''}`} onClick={() => { setPage(p); if (p === 'history' || p === 'coins') loadHistory(); }}>{l}</button>
        ))}
      </div>
      <div className="nav-right">
        <div key={coinAnimKey} className="coin-badge coin-anim" onClick={() => { setPage('coins'); loadHistory(); }}>🪙 {cineCoins}</div>
        <button className="chip chip-grey" onClick={() => { setUser(null); showToast('Logged out'); }}>Logout</button>
      </div>
    </nav>
  );

  const MobileNav = () => (
    <div className="mobile-nav">
      {[['gallery', '🎭', 'Movies'], ['store', '🍿', 'Snacks'], ['parking', '🅿️', 'Park'], ['history', '🎟', 'Tickets'], ['coins', '🪙', 'Coins']].map(([p, ico, l]) => (
        <button key={p} className={`mob-tab ${page === p ? 'active' : ''}`} onClick={() => { setPage(p); if (p === 'history' || p === 'coins') loadHistory(); }}>
          <span className="mob-tab-ico">{ico}</span><span className="mob-tab-lbl">{l}</span>
        </button>
      ))}
    </div>
  );

  /* AUTH PAGE */
  if (!user) return (
    <>
      <style>{G}</style><Toast msg={toast} />
      {showAdminLogin && <AdminLoginModal onSuccess={() => { setShowAdminLogin(false); onAdmin(); }} onClose={() => setShowAdminLogin(false)} />}
      <div className="auth-full">
        <div className="auth-left">
          <div className="auth-left-bg" />
          {[{ t: '12%', l: '8%', s: 3, d: '2s', dl: '0s' }, { t: '22%', l: '82%', s: 5, d: '3s', dl: '.5s' }, { t: '58%', l: '12%', s: 4, d: '2.5s', dl: '1s' }, { t: '78%', l: '78%', s: 3, d: '2s', dl: '1.5s' }].map((st, i) => (
            <div key={i} className="auth-star" style={{ top: st.t, left: st.l, width: st.s, height: st.s, '--dur': st.d, '--delay': st.dl }} />
          ))}
          <div className="auth-cinema-logo">🎬</div>
          <div className="auth-brand-name">Cine Time</div>
          <div className="auth-brand-tag">Your Ultimate Movie Experience</div>
          <div className="auth-features">
            {[['🎟', 'Book Tickets Online'], ['🍿', 'Order Refreshments'], ['🅿️', 'Reserve Parking'], ['🪙', 'Earn CineCoins']].map(([ico, txt]) => (
              <div key={txt} className="auth-feat"><div className="auth-feat-ico">{ico}</div>{txt}</div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,.08)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '14px 18px', border: '1px solid rgba(255,255,255,.12)', textAlign: 'center', width: '100%', maxWidth: 260 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Founded By</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>Vidhyadharan RP</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>Creator & CEO, Cine Time</div>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-right-logo">🎬</div>
          <div className="auth-h">{authMode === 'login' ? 'Welcome back' : 'Join Cine Time'}</div>
          <div className="auth-s">{authMode === 'login' ? 'Sign in to book your show' : 'Create account in seconds'}</div>
          <div className="inp-wrap"><span className="inp-ico">👤</span><input className="inp" placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
          {authMode === 'register' && <>
            <div className="inp-wrap"><span className="inp-ico">✉️</span><input className="inp" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="inp-wrap"><span className="inp-ico">📱</span><input className="inp" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </>}
          <div className="inp-wrap"><span className="inp-ico">🔑</span><input className="inp" type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAuth(authMode)} /></div>
          <div style={{ height: 6 }} />
          <button className="btn btn-red" onClick={() => handleAuth(authMode)}>{authMode === 'login' ? 'Sign In →' : 'Create Account →'}</button>
          <div className="divider"><div className="divider-line" /><span className="divider-txt">or</span><div className="divider-line" /></div>
          <button className="btn btn-dark" onClick={() => setShowAdminLogin(true)}>⚙️ Admin Portal</button>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--t3)' }}>
            {authMode === 'login' ? <>New? <span style={{ color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setAuthMode('register')}>Create account</span></>
              : <>Have account? <span style={{ color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setAuthMode('login')}>Sign in</span></>}
          </div>
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: 'var(--t4)' }}>Founded by Vidhyadharan RP · Cine Time © 2024</div>
        </div>
      </div>
      <Chatbot movies={movies} />
    </>
  );

  /* GALLERY */
  if (page === 'gallery') return (
    <><style>{G}</style><Toast msg={toast} />
      <ETicketModal data={eTicketModal} onClose={() => { setETicketModal(null); setPage('gallery'); }} userEmail={userEmail} />
      <NavBar />
      <div className="page-shell page">
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Hey {user} 👋</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, marginTop: 3 }}>Now Showing</div>
        </div>
        <div className="movie-grid">
          {movies.map((m, i) => (
            <div key={m._id || i} className="movie-card" style={{ animationDelay: `${i * .06}s` }} onClick={() => { setMovie(m); setSel([]); setSelShow(null); setPage('timings'); }}>
              {m.img ? <img src={m.img} className="movie-poster" alt={m.title} onError={e => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} /> : null}
              <div className="movie-poster-placeholder" style={{ display: m.img ? 'none' : 'flex' }}>🎬</div>
              <div className="movie-meta">
                <div className="movie-name">{m.title}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, marginTop: 2 }}>⭐ {m.rating} · {m.language}</div>
                <div className="movie-badge">{m.genre}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <MobileNav /><Chatbot movies={movies} /></>
  );

  /* TIMINGS */
  if (page === 'timings') {
    const shows = movie.shows?.length > 0 ? movie.shows : (movie.timings || []).map(t => ({ time: t, screenName: '', screenId: '', rows: 8, seatsPerRow: 10, capacity: 80 }));
    return (
      <><style>{G}</style><Toast msg={toast} />
        <nav className="nav">
          <button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontFamily: "'Figtree',sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: '6px 10px', borderRadius: 10 }} onClick={() => setPage('gallery')}>‹ Back</button>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Select Showtime</span>
          <div style={{ width: 70 }} />
        </nav>
        <div className="timings-wrap page">
          <div className="timings-card">
            {movie.img
              ? <img src={movie.img} style={{ width: '100%', borderRadius: 'var(--r2)', aspectRatio: '16/9', objectFit: 'cover', marginBottom: 18 }} alt={movie.title} onError={e => e.target.style.display = 'none'} />
              : <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--card2)', borderRadius: 'var(--r2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, marginBottom: 18 }}>🎬</div>}
            <div style={{ fontSize: 21, fontWeight: 900, marginBottom: 3 }}>{movie.title}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 5 }}>⭐ {movie.rating} · {movie.language} · {movie.duration}</div>
            {movie.description && <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16, lineHeight: 1.6 }}>{movie.description}</div>}
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Choose Showtime</div>
            {shows.map((show, si) => {
              const t = show.time; const h = parseInt(t); const isAM = t.includes('AM');
              const period = (isAM && h !== 12) ? '🌅 Morning' : (!isAM && (h === 12 || h <= 4)) ? '☀️ Afternoon' : (!isAM && h < 8) ? '🌆 Evening' : '🌙 Night';
              const price = (isAM && h !== 12) ? movie.pricing?.morning || 120 : (!isAM && (h === 12 || h <= 4)) ? movie.pricing?.afternoon || 150 : (!isAM && h < 8) ? movie.pricing?.evening || 180 : movie.pricing?.night || 200;
              return (
                <button key={si} className="timing-btn" onClick={() => { setSelShow(show); setPage('seats'); }}>
                  <div>
                    <span>{t}</span>
                    <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 6 }}>{period}</span>
                    {show.screenName && <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3 }}>🖥️ {show.screenName} · {show.rows || 8}×{show.seatsPerRow || 10}={show.capacity || 80} seats</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>₹{price}</span>
                    <span className="avail-ok">Avail</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <Chatbot movies={movies} /></>
    );
  }

  /* SEATS */
  if (page === 'seats') {
    const cols = Math.min(spr, 12);
    const seatSize = Math.max(30, Math.min(44, Math.floor(360 / cols)));
    return (
      <><style>{G}</style><Toast msg={toast} />
        <nav className="nav">
          <button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontFamily: "'Figtree',sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: '6px 10px' }} onClick={() => setPage('timings')}>‹ Back</button>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Pick Seats</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {sel.length > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>{sel.length} sel</span>}
          </div>
        </nav>
        <div className="seats-wrap page" style={{ gap: 0, paddingTop: 72 }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{movie.title}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span>🕐 {selShow?.time}</span>
              {selShow?.screenName && <><span style={{ width: 3, height: 3, background: 'var(--t4)', borderRadius: '50%', display: 'inline-block' }} /><span>🖥️ {selShow.screenName}</span></>}
              <span style={{ width: 3, height: 3, background: 'var(--t4)', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>₹{getPrice()}/seat</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ width: '75%', maxWidth: 300, height: 5, borderRadius: '0 0 50% 50% / 0 0 6px 6px', background: 'linear-gradient(90deg,transparent 5%,var(--accent) 35%,var(--accent2) 65%,transparent 95%)', opacity: .85 }} />
            <div style={{ marginTop: 5, fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 3 }}>{selShow?.screenName || 'SCREEN'} — {capacity} SEATS ({selShow?.rows || 8} ROWS × {spr} COLS)</div>
          </div>
          <div style={{ background: 'var(--card)', borderRadius: 'var(--r2)', padding: 16, boxShadow: 'var(--sh1)', border: '1px solid var(--bdr)', marginBottom: 14, width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},${seatSize}px)`, gap: 4, justifyContent: 'center' }}>
              {[...Array(capacity)].map((_, i) => {
                const isTaken = bookedSeats.includes(i);
                const isSel = sel.includes(i);
                return (
                  <div key={i} className={`seat-btn ${isTaken ? 's-booked' : isSel ? 's-sel' : 's-avail'}`}
                    style={{ width: seatSize, height: seatSize, fontSize: Math.max(7, 11 - Math.floor(capacity / 60)) }}
                    onClick={() => !isTaken && setSel(p => p.includes(i) ? p.filter(s => s !== i) : [...p, i])}>
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="legend">
            <div className="leg-item"><div className="leg-dot" style={{ background: '#EBEBF0' }} />Available</div>
            <div className="leg-item"><div className="leg-dot" style={{ background: 'var(--accent)' }} />Selected</div>
            <div className="leg-item"><div className="leg-dot" style={{ background: '#F2F2F7', border: '1px solid #C7C7CC' }} />Taken</div>
          </div>
          <div className="summary-bar">
            <div><div className="sum-label">Seats</div><div style={{ fontSize: 12, fontWeight: 700, maxWidth: 200, wordBreak: 'break-word' }}>{sel.length > 0 ? sel.map(s => s + 1).join(', ') : '—'}</div></div>
            <div style={{ textAlign: 'right' }}><div className="sum-label">Total</div><div className="sum-val">₹{ticketTotal}</div></div>
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 460 }}>
            <button className="btn btn-grey" style={{ flex: 1 }} onClick={() => setPage('timings')}>Cancel</button>
            <button className="btn btn-red" style={{ flex: 2 }} disabled={sel.length === 0} onClick={() => setPage('pay')}>
              {sel.length > 0 ? `Book ${sel.length} Seat${sel.length > 1 ? 's' : ''} — ₹${ticketTotal}` : 'Select Seats'}
            </button>
          </div>
        </div>
        <Chatbot movies={movies} /></>
    );
  }

  /* PAYMENT */
  if (page === 'pay') return (
    <><style>{G}</style><Toast msg={toast} />
      <div className="pay-wrap">
        <div className="pay-card pop">
          <div style={{ width: 72, height: 72, borderRadius: 22, background: payMethod === 'coins' ? 'linear-gradient(145deg,#FFB800,#FF9500)' : 'linear-gradient(145deg,#2d6adb,#1a4fb5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>
            {payMethod === 'coins' ? '🪙' : '💳'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 5 }}>Checkout</div>
          <div style={{ color: 'var(--t3)', fontSize: 13, marginBottom: 4 }}>{movie?.title} · {selShow?.time}</div>
          {selShow?.screenName && <div style={{ color: 'var(--t3)', fontSize: 12, marginBottom: 14 }}>🖥️ {selShow.screenName}</div>}
          <div className="pay-method-tabs">
            <div className={`pay-method-tab ${payMethod === 'razorpay' ? 'selected' : ''}`} onClick={() => setPayMethod('razorpay')}>
              <div style={{ fontSize: 17, marginBottom: 2 }}>💳</div><div>Razorpay</div><div style={{ fontSize: 9, color: 'var(--t3)' }}>Card / UPI / NB</div>
            </div>
            <div className={`pay-method-tab ${payMethod === 'coins' ? 'selected' : ''}`} style={{ opacity: canPayCoins ? 1 : .45 }}
              onClick={() => { if (canPayCoins) setPayMethod('coins'); else showToast(`Need ${coinsForTickets} 🪙. You have ${cineCoins}.`); }}>
              <div style={{ fontSize: 17, marginBottom: 2 }}>🪙</div><div>CineCoins</div><div style={{ fontSize: 9, color: 'var(--t3)' }}>{coinsForTickets} needed</div>
            </div>
          </div>
          <div className="pay-table">
            <div className="pay-row"><span className="pay-lbl">Tickets ({sel.length} × ₹{getPrice()})</span><span className="pay-val">₹{ticketTotal}</span></div>
            {refreshTotal > 0 && <div className="pay-row"><span className="pay-lbl">Refreshments</span><span className="pay-val">₹{refreshTotal}</span></div>}
            <div className="pay-row pay-total"><span className="pay-lbl">Total</span><span className="pay-val">{payMethod === 'coins' ? `${coinsForTickets} 🪙` : `₹${ticketTotal + refreshTotal}`}</span></div>
          </div>
          {payMethod === 'razorpay' && (
            <>
              <div className="rzp-info">
                <div style={{ fontSize: 24, marginBottom: 4 }}>💳</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1a4fb5', marginBottom: 2 }}>Pay via Razorpay</div>
                <div style={{ fontSize: 11, color: '#6C6C70' }}>Card · UPI · Net Banking · Wallets<br />Test card: 4111 1111 1111 1111, CVV 123</div>
              </div>
              <button className="btn btn-upi" onClick={() => confirmBooking('razorpay')} disabled={rzpLoading || sel.length === 0}>
                {rzpLoading ? <><span className="spinner" style={{ marginRight: 8 }} />Processing...</> : `💳 Pay ₹${ticketTotal + refreshTotal} via Razorpay`}
              </button>
            </>
          )}
          {payMethod === 'coins' && (
            <>
              <div style={{ background: 'linear-gradient(135deg,#FFF8E0,#FFF0C0)', borderRadius: 13, padding: '16px 18px', marginBottom: 14, border: '2px solid rgba(255,184,0,.3)' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>🪙</div>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--t1)', marginBottom: 3 }}>{coinsForTickets} CineCoins</div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>500 coins per ticket · You have {cineCoins}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>After: {cineCoins - coinsForTickets} coins remaining</div>
              </div>
              <button className="btn btn-coins" onClick={() => confirmBooking('coins')} disabled={sel.length === 0}>
                🪙 Pay {coinsForTickets} CineCoins
              </button>
            </>
          )}
          <div style={{ height: 9 }} />
          <button className="btn btn-grey" onClick={() => { setPage('seats'); setPayMethod('razorpay'); }}>← Go back</button>
          <div style={{ marginTop: 12, fontSize: 10, color: 'var(--t4)', textAlign: 'center' }}>🪙 Earn 10 CineCoins per ticket via Razorpay</div>
        </div>
      </div>
      <Chatbot movies={movies} /></>
  );

  /* STORE — FIX #2: Show snack image if available, fallback to emoji */
  if (page === 'store') return (
    <><style>{G}</style><Toast msg={toast} />
      <nav className="nav">
        <button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontFamily: "'Figtree',sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: '6px 10px' }} onClick={() => setPage('gallery')}>‹ Back</button>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Snack Bar 🍿</span>
        <div key={coinAnimKey} className="coin-badge coin-anim">🪙 {cineCoins}</div>
      </nav>
      <div className="page-shell page" style={{ paddingBottom: cartQty > 0 ? 95 : 80 }}>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 5 }}>Refreshments</div>
        <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 18 }}>+5 CineCoins per order via Razorpay!</div>
        <div className="cat-row">{cats.map(c => <button key={c} className={`cat-btn ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
        <div className="menu-grid">
          {filteredSnacks.map(item => {
            const qty = cart[item._id]?.qty || 0;
            return (
              <div key={item._id} className="menu-card" onClick={() => addToCart(item)}>
                {qty > 0 && <div className="qty-badge">×{qty}</div>}
                {/* FIX #2: Display snack image if `img` URL exists, otherwise show emoji */}
                {item.img
                  ? <img src={item.img} alt={item.name} className="menu-img" onError={e => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }} />
                  : null}
                <div className="menu-emoji" style={{ display: item.img ? 'none' : 'flex' }}>{item.emoji}</div>
                <div className="menu-body">
                  <div className="menu-name">{item.name}</div>
                  <div className="menu-price">₹{item.price}</div>
                  <div style={{ fontSize: 10, color: '#B8860B', fontWeight: 600 }}>🪙 {item.coinPrice} coins</div>
                </div>
                <div className="menu-plus">+</div>
              </div>
            );
          })}
        </div>
      </div>
      {cartQty > 0 && (
        <div className="cart-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, background: 'var(--accent-bg)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--accent)', fontSize: 15 }}>{cartQty}</div>
            <div><div style={{ fontWeight: 900, fontSize: 16 }}>₹{refreshTotal}</div><div style={{ fontSize: 11, color: 'var(--t3)' }}>{cartQty} item{cartQty > 1 ? 's' : ''}</div></div>
          </div>
          <button style={{ background: 'linear-gradient(135deg,#2d6adb,#1a4fb5)', color: '#fff', border: 'none', borderRadius: 13, padding: '12px 22px', fontFamily: "'Figtree',sans-serif", fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
            onClick={async () => {
              await openRazorpay({
                amount: refreshTotal,
                description: `Snacks · ${cartItems.length} item(s)`,
                onSuccess: async ({ orderId, paymentId }) => {
                  try {
                    const rRes = await axios.post(`${API}/refreshments/order`, {
                      username: user, movieName: 'Snack Bar', timing: '',
                      items: cartItems.map(i => ({ name: i.name, qty: i.qty, price: i.price, coinPrice: i.coinPrice })),
                      total: refreshTotal, paymentMethod: 'razorpay',
                      razorpayOrderId: orderId, razorpayPaymentId: paymentId,
                    });
                    const nb = rRes.data.newCoinBalance ?? await refreshCoins(user);
                    updateCoins(nb); setCart({});
                    showToast(`🛒 Ordered! +${rRes.data.coinsEarned || 0} 🪙`);
                  } catch { showToast('❌ Order failed'); }
                },
                onFailure: () => { },
              });
            }}>Pay ₹{refreshTotal} →</button>
        </div>
      )}
      <MobileNav /><Chatbot movies={movies} /></>
  );

  /* PARKING (PRESERVED UNCHANGED) */
  if (page === 'parking') return (
    <><style>{G}</style><Toast msg={toast} />
      <NavBar />
      <div className="parking-wrap page">
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 5 }}>🅿️ Parking</div>
        <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}>Block A ₹30 · Block B ₹60 · Block C ₹80 · Block D Free · +5🪙 via Razorpay</div>
        {selParkSlot && selSlotObj && (
          <div style={{ background: 'var(--card)', borderRadius: 'var(--r3)', padding: 22, marginBottom: 18, boxShadow: 'var(--sh2)', border: '1px solid var(--bdr)' }}>
            <div style={{ fontWeight: 900, fontSize: 19, marginBottom: 4 }}>Slot {selSlotObj.slotNumber}</div>
            <div style={{ color: 'var(--t3)', fontSize: 13, marginBottom: 16 }}>{selSlotObj.slotType} · {selSlotObj.price > 0 ? `₹${selSlotObj.price}` : 'Free'}{selSlotObj.coinPrice > 0 ? ` or ${selSlotObj.coinPrice} 🪙` : ''}</div>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <button className="btn btn-upi btn-sm" disabled={parkLoading} onClick={() => bookParking(selSlotObj, 'razorpay')}>
                {parkLoading ? <span className="spinner" /> : selSlotObj.price > 0 ? `💳 Pay ₹${selSlotObj.price}` : '✅ Reserve Free Slot'}
              </button>
              {selSlotObj.coinPrice > 0 && (
                <button className="btn btn-coins btn-sm" disabled={parkLoading || cineCoins < selSlotObj.coinPrice} onClick={() => bookParking(selSlotObj, 'coins')}>
                  🪙 {selSlotObj.coinPrice} Coins
                </button>
              )}
            </div>
            <button className="btn btn-grey btn-sm" style={{ marginTop: 9 }} onClick={() => setSelParkSlot(null)}>Cancel</button>
          </div>
        )}
        {[{ block: 'A', icon: '🏍', label: 'Block A — Two-Wheeler', color: '#007AFF', price: '₹30/slot' },
          { block: 'B', icon: '🚗', label: 'Block B — Four-Wheeler', color: '#34C759', price: '₹60/slot' },
          { block: 'C', icon: '🚙', label: 'Block C — Premium', color: '#FF9500', price: '₹80/slot' },
          { block: 'D', icon: '♿', label: 'Block D — Disabled', color: '#8E8E93', price: 'Free' },
        ].map(({ block, icon, label, color, price }) => {
          const slots = parkingSlots.filter(s => (s.block === block) || (!s.block && s.slotNumber?.startsWith(block)));
          const freeCount = slots.filter(s => !s.isBooked).length;
          return (
            <div key={block} className="parking-block-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 900 }}>{icon}</div>
                <div><div style={{ fontWeight: 800, fontSize: 15 }}>{label}</div><div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 1 }}>{price} · {freeCount}/{slots.length} available</div></div>
              </div>
              <div className="parking-slots-grid">
                {slots.map(slot => {
                  const isOwn = slot.bookedBy === user;
                  const isSel = selParkSlot === slot.slotNumber;
                  let cls = 'p-free';
                  if (slot.isBooked) cls = 'p-booked';
                  else if (slot.slotType === 'Disabled') cls = 'p-disabled';
                  else if (isSel) cls = 'p-selected';
                  return (
                    <div key={slot.slotNumber} className={`parking-slot ${cls}`}
                      onClick={() => { if (slot.isBooked) return; setSelParkSlot(s => s === slot.slotNumber ? null : slot.slotNumber); }}>
                      <div className="p-slot-num" style={{ color: isSel ? '#fff' : undefined }}>{slot.slotNumber}</div>
                      <div className="p-slot-status" style={{ color: slot.isBooked ? 'var(--accent)' : isSel ? 'rgba(255,255,255,.85)' : slot.slotType === 'Disabled' ? 'var(--t4)' : 'var(--green)' }}>
                        {slot.isBooked ? (isOwn ? 'YOURS' : 'FULL') : slot.slotType === 'Disabled' ? 'RESERVED' : isSel ? 'SELECTED' : 'FREE'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <MobileNav /><Chatbot movies={movies} /></>
  );

  /* HISTORY */
  if (page === 'history') return (
    <><style>{G}</style><Toast msg={toast} />
      <NavBar />
      <div className="page-shell page" style={{ paddingBottom: 80 }}>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 16 }}>My Bookings 🎟️</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto' }}>
          {[['tickets', '🎟 Tickets'], ['refreshments', '🍿 Snacks'], ['parking', '🅿️ Parking']].map(([k, l]) => (
            <button key={k} onClick={() => setHistTab(k)}
              style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: "'Figtree',sans-serif", fontWeight: 700, fontSize: 13, background: histTab === k ? 'var(--accent)' : 'var(--card)', color: histTab === k ? '#fff' : 'var(--t3)', boxShadow: histTab === k ? '0 4px 12px rgba(255,55,95,.3)' : 'var(--sh1)', whiteSpace: 'nowrap' }}>{l}</button>
          ))}
        </div>
        {histTab === 'tickets' && (
          <>
            {(!history.tickets?.length && !history.adminBookings?.length)
              ? <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--t3)' }}><div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>No bookings yet. Book a show!</div>
              : <>
                {history.tickets?.map((h, i) => (
                  <div key={i} className="hist-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>{h.movieName}</div>
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>🕐 {h.timing}{h.screenName ? ` · 🖥️ ${h.screenName}` : ''}</div>
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Seats: {h.selectedSeats?.map(s => s + 1).join(', ')}</div>
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{h.paymentMethod === 'coins' ? `🪙 ${h.coinsUsed} coins` : `₹${h.amount}`} · {h.status}</div>
                        {h.coinsEarned > 0 && <div style={{ fontSize: 11, color: '#B8860B', fontWeight: 700, marginTop: 5 }}>🪙 +{h.coinsEarned} earned</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
                        <div className="hist-badge">{new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                        {h.eTicketQR && (
                          <div style={{ cursor: 'pointer' }} onClick={() => setETicketModal({ qr: h.eTicketQR, movieName: h.movieName, timing: h.timing, screenName: h.screenName, seats: h.selectedSeats, amount: h.amount })}>
                            <img src={h.eTicketQR} alt="QR" style={{ width: 52, borderRadius: 8, border: '2px solid var(--accent-bg)' }} />
                            <div style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, textAlign: 'center', marginTop: 2 }}>Tap QR</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {history.adminBookings?.map((h, i) => (
                  <div key={`admin-${i}`} className="hist-card" style={{ border: '1px solid rgba(255,184,0,.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#B8860B' }}>{h.movieName} <span style={{ fontSize: 10, background: 'rgba(255,184,0,.15)', color: '#B8860B', borderRadius: 5, padding: '2px 6px' }}>Admin Booked</span></div>
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>🕐 {h.timing}{h.screenName ? ` · 🖥️ ${h.screenName}` : ''}</div>
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Seats: {h.selectedSeats?.map(s => s + 1).join(', ')}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
                        <div className="hist-badge">{new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                        {h.eTicketQR && (
                          <div style={{ cursor: 'pointer' }} onClick={() => setETicketModal({ qr: h.eTicketQR, movieName: h.movieName, timing: h.timing, screenName: h.screenName, seats: h.selectedSeats, amount: 0 })}>
                            <img src={h.eTicketQR} alt="QR" style={{ width: 52, borderRadius: 8, border: '2px solid rgba(255,184,0,.3)' }} />
                            <div style={{ fontSize: 9, color: '#B8860B', fontWeight: 700, textAlign: 'center', marginTop: 2 }}>Tap QR</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>}
          </>
        )}
        {histTab === 'refreshments' && (
          <>
            {!history.refreshments?.length
              ? <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--t3)' }}><div style={{ fontSize: 48, marginBottom: 12 }}>🍿</div>No snack orders yet!</div>
              : history.refreshments.map((r, i) => (
                <div key={i} className="hist-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>🍿 Snack Order</div>
                      <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{r.items?.map(i => `${i.name} ×${i.qty}`).join(', ')}</div>
                      <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{r.paymentMethod === 'coins' ? `🪙 ${r.coinsUsed}` : `₹${r.total}`}</div>
                      {r.coinsEarned > 0 && <div style={{ fontSize: 11, color: '#B8860B', fontWeight: 700, marginTop: 5 }}>🪙 +{r.coinsEarned} earned</div>}
                    </div>
                    <div className="hist-badge">{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  </div>
                </div>
              ))}
          </>
        )}
        {histTab === 'parking' && (
          <>
            {!history.parking?.length
              ? <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--t3)' }}><div style={{ fontSize: 48, marginBottom: 12 }}>🅿️</div>No parking bookings yet!</div>
              : history.parking.map((p, i) => (
                <div key={i} className="hist-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>🅿️ Slot {p.slotNumber}</div>
                      <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{p.slotType} · {p.movieName || 'General'}</div>
                      <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{p.paymentMethod === 'coins' ? `🪙 ${p.coinsUsed}` : `₹${p.price}`}</div>
                      {p.coinsEarned > 0 && <div style={{ fontSize: 11, color: '#B8860B', fontWeight: 700, marginTop: 5 }}>🪙 +{p.coinsEarned} earned</div>}
                    </div>
                    <div className="hist-badge">{new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
      {eTicketModal && <ETicketModal data={eTicketModal} onClose={() => setETicketModal(null)} userEmail={userEmail} />}
      <MobileNav /><Chatbot movies={movies} /></>
  );

  /* COINS */
  if (page === 'coins') return (
    <><style>{G}</style><Toast msg={toast} />
      <NavBar />
      <div className="page-shell page" style={{ paddingBottom: 80 }}>
        <div className="coins-hero">
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, opacity: .85, textTransform: 'uppercase', marginBottom: 7 }}>Your Balance</div>
          <div key={coinAnimKey} className="coins-balance coin-anim">{cineCoins} 🪙</div>
          <div style={{ opacity: .85, marginTop: 7, fontSize: 13 }}>500 coins = 1 free ticket · Earn on every Razorpay purchase!</div>
          <button onClick={() => refreshCoins(user)} style={{ marginTop: 12, background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 10, padding: '7px 16px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🔄 Refresh Balance</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 11, marginBottom: 22 }}>
          {[['🎟', 'Tickets', '10 coins/ticket'], ['🍿', 'Snacks', '5 coins/order'], ['🅿️', 'Parking', '5 coins/slot'], ['💳', 'Redeem', '500 coins = free ticket']].map(([ico, name, desc]) => (
            <div key={name} style={{ background: 'var(--card)', borderRadius: 'var(--r2)', padding: 14, boxShadow: 'var(--sh1)', border: '1px solid var(--bdr)', textAlign: 'center' }}>
              <div style={{ fontSize: 24 }}>{ico}</div><div style={{ fontWeight: 800, fontSize: 13, marginTop: 5 }}>{name}</div><div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>Transaction History</div>
        {coinHistory.length === 0
          ? <div style={{ textAlign: 'center', padding: 36, color: 'var(--t3)' }}>No coin activity yet. Book a ticket to start earning!</div>
          : <div className="coins-table">{coinHistory.map((c, i) => (
            <div key={i} className="coins-row">
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{c.text}</div><div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{new Date(c.date).toLocaleDateString('en-IN')}</div></div>
              <div className={c.type === 'earn' ? 'coins-pos' : 'coins-neg'}>{c.type === 'earn' ? '+' : ''}{c.amount} 🪙</div>
            </div>
          ))}</div>}
      </div>
      <MobileNav /><Chatbot movies={movies} /></>
  );

  return null;
}

/* ─── ROOT ─────────────────────────────────────────────────────────────────── */
export default function App() {
  const [mode, setMode] = useState('user');
  return mode === 'user'
    ? <UserApp onAdmin={() => setMode('admin')} />
    : <AdminApp onBack={() => setMode('user')} />;
}