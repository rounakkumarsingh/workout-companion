"""
Compare PDF hyperlinks vs program.ts demoVideoUrl values
"""
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs

PROGRAM_TS = (Path(__file__).resolve().parent.parent / "src" / "data" / "program.ts").read_text()

# Extract video ID from various YouTube URL formats
def extract_video_id(url):
    parsed = urlparse(url)
    if parsed.hostname in ('youtu.be', 'www.youtu.be'):
        return parsed.path.lstrip('/').split('?')[0]
    if parsed.hostname in ('youtube.com', 'www.youtube.com', 'm.youtube.com'):
        qs = parse_qs(parsed.query)
        return qs.get('v', [None])[0]
    return None

# ============================================================
# 1. Load PDF links from output above
# ============================================================
pdf_urls_raw = [
    "https://youtu.be/-XVRl8KU7x0?si=o46w1tp8fNYfD-gU",
    "https://youtu.be/0TP9kVcWGic?si=5lWdSFfUA27mop9-",
    "https://youtu.be/1LhGmhVFe2Y?si=vTZPhYePzGkU4I-g",
    "https://youtu.be/1yKAQLVV_XI?si=G0wEZEbz8Kq9vFnF",
    "https://youtu.be/3CaIq8jZe18?si=ZWFiM0R-hqcvpiQj",
    "https://youtu.be/3FNfi_PrP9Y?si=xHZ-SXqhL_0_tXBD",
    "https://youtu.be/552L1K3Rb_Q?si=bwLZLzHR0AHulO9I",
    "https://youtu.be/5h_NehuTqe4?si=bZWK6q3A9wnD8TIW",
    "https://youtu.be/6lR2JdxUh7w?si=Q_4oyceNkI-WarRg",
    "https://youtu.be/6pfj0G7VKdM?si=bXJmuLkyC3E3PYHW",
    "https://youtu.be/8m2jNHBP580?si=a4KGz2Dm0gRioyBG",
    "https://youtu.be/9_I1PqZAjdA?si=hLmz2aLH05YfsUTF",
    "https://youtu.be/9ksG-O0ZUto?si=I5F9HRiZe4C8JNOo",
    "https://youtu.be/9rFS1gg0vJM?si=ihh3GBLwr9TyBojo",
    "https://youtu.be/B8PB5RPhTWQ?si=JQ8J3qbCDkUCGtt5",
    "https://youtu.be/BC_eDtrB-M4?si=j6tHLEbqdJRbGeTW",
    "https://youtu.be/BC_eDtrB-M4?si=lhut9GRQ9n9g82Mz",
    "https://youtu.be/BFZyW_7ld0c?si=2quAznmV1D3pvYGG",
    "https://youtu.be/CI88L1VNvEs?si=UjZP3Ep5QaYBM5rC",
    "https://youtu.be/CWH5J_7kzjM?si=FlPzreLDPHogRxve",
    "https://youtu.be/CrfvmSGfT2c?si=hsWBdUyeIyjzr_7h",
    "https://youtu.be/D-kqUKEQZZ0?si=1i2hWkoG06CDuFmq",
    "https://youtu.be/Dn7qgf9iSH8?si=mCWsykyTRl0jYKA0",
    "https://youtu.be/FvekMyIs-yk?si=WE_SAmFUUdmsWGgL",
    "https://youtu.be/GOqHdmshRKY",
    "https://youtu.be/GYoUoVNlbGc?si=mKlJH3mz_e7-RCu0",
    "https://youtu.be/GhrVM-jPIEA?si=_qGmAZLOCDUWVHy_",
    "https://youtu.be/Hy6f1Lz_PiA?si=MTEbKv_uMCL6zvge",
    "https://youtu.be/IYXRrYXfVLc?si=8eUNzIQ9o7Y-XpSp",
    "https://youtu.be/K2yKEoazT3g?si=mLbXtOh8oUF8lcIs",
    "https://youtu.be/MmuyHKYCLps?si=JK1d5szj5PIIbYYm",
    "https://youtu.be/MnMux3Wc0Ac?si=diOk1ZKwTwTa4Sx0",
    "https://youtu.be/NwQ5Ch5t5Vk?si=JHztlva6LI2NPBDC",
    "https://youtu.be/OfjncdW_Vyc?si=kiSMQzlVHKNIQJ7J",
    "https://youtu.be/Oq7gJuAuJh0?si=MVr0h6JsUR4PxMgw",
    "https://youtu.be/R7f45Mv7yyg?si=xsSbcMbkSOuYetpO",
    "https://youtu.be/S2agsLlUSII?si=ZbM6zqY3sC151i0A",
    "https://youtu.be/S6DTPNZ_-F4?si=y3rx6TaVEuUONiI2",
    "https://youtu.be/SCQVmN1gYsk?si=Enyh4L6ZDiCc6RyU",
    "https://youtu.be/SEjKxJGg_C8?si=I_mi9RO4vFVVhFER",
    "https://youtu.be/TTgICSfj1hY?si=yOoxlJpIv6HqFkwW",
    "https://youtu.be/TWUnnDK8rck?si=NmqKbwgMcHmaDp6T",
    "https://youtu.be/V-B_Y-OvOTQ?si=3cSY6hI1IDiedc8y",
    "https://youtu.be/WMrgn4GG7mI?si=0dUmQt-g_zOMm14G",
    "https://youtu.be/WTkQLAethtg?si=BRKYwVgqPyD9Iayw",
    "https://youtu.be/WTkQLAethtg?si=FftNs9g0OeiVccy2",
    "https://youtu.be/Wmivm40AV3Q?si=pAcxmzGxP16bt5I5",
    "https://youtu.be/XxGCRSJmgwY?si=4ohHVIRqih3xCbD0",
    "https://youtu.be/Y8fb_rtEU_4?si=nwaICiwwS3TatSq1",
    "https://youtu.be/YdUUYFgpA7g?si=IiD6eODwVqDS3WlB",
    "https://youtu.be/Z0NIYS9nyoQ?si=PgrGaJLln2uZLfnY",
    "https://youtu.be/ZheUsKqU81M?si=r3a6FT_AqWp1nq6L",
    "https://youtu.be/Zjzt4MRbAlc?si=Z5K9MxycnTyrnB1N",
    "https://youtu.be/b0ypSz63UGo?si=dMxuJGtxkR4jnUbb",
    "https://youtu.be/b8fYnZ-usP0",
    "https://youtu.be/bCa036rGtVU?si=egxwlHADiCBQGss7",
    "https://youtu.be/ck1zjNTnFew?si=EgggtiVFxulCoYXU",
    "https://youtu.be/dEdnC3ca-Yg?si=fAVE3jH_TAGmtG_u",
    "https://youtu.be/eFsNZc69m10?si=HeWumPVqClmv0LyC",
    "https://youtu.be/eWAjlO4FWPQ?si=CaRzMpTB37IdGgpM",
    "https://youtu.be/epBrpaGHMcg?si=FMV9IKBOvBkuUOZM",
    "https://youtu.be/fbLTzgTKOR8?si=z-O6SNR4HG4rd09j",
    "https://youtu.be/fzpYiRtzmFA?si=M3BGSywSskWqGRnE",
    "https://youtu.be/gGTgyCU9gcg?si=2h_43OzMnRo5nVWU",
    "https://youtu.be/ggFtGGYobE4?si=4X2ATuVtPlv-ihy2",
    "https://youtu.be/hci6iKFtTkg?si=R8PHuNMWbGOoTd9e",
    "https://youtu.be/htDXu61MPio?si=WNsXh0BmNMXONRHP",
    "https://youtu.be/ijsSiWSzYw0?si=ADBJRkNSajLiVayN",
    "https://youtu.be/jQ9rkfvAbIc?si=m1Q5OHGTNvhD6TZ9",
    "https://youtu.be/lA4_1F9EAFU?si=5Bh19rDwBplX5QUz",
    "https://youtu.be/lEeCPhlFZig?si=j-525U0GRL6YMLvK",
    "https://youtu.be/moFqLlptX7Q?si=vsQXeROXKVa3beB7",
    "https://youtu.be/nQL5ieH39sw?si=RjZSWBZ3CGKg-pax",
    "https://youtu.be/o4eazahiXQw?si=L61XPqSVKpnjf1r1",
    "https://youtu.be/oDKGCsTjAk8?si=6CA3mVlk1fYWb8Ek",
    "https://youtu.be/oRxTKRtP8RE?si=S_C_5SZAal_SIFBq",
    "https://youtu.be/okCWuhxJEvw?si=-Q9-BAJbFeebhfpF",
    "https://youtu.be/pozooPg6PBE?si=uVtC8JPKXvZKeVlE",
    "https://youtu.be/q8qlHwcuOtc?si=J-TyFYuv9rwi5VTy",
    "https://youtu.be/qJzc-iHKGdg?si=GGd61Dr4uoDUI9b6",
    "https://youtu.be/rGqwkinWqYI?si=-ygKr5ZOwrYdG0fX",
    "https://youtu.be/roKtfQZbxzg?si=x0BVOCTXzrksYhHL",
    "https://youtu.be/sOYvvFPYdsU?si=QAdyWBV_5NAX2CtW",
    "https://youtu.be/sX4tGtcc62k?si=mparE5f2nb9KfXPl",
    "https://youtu.be/tFpwBr_7KPg?si=0T63q37dQLKi118I&t=28",
    "https://youtu.be/tFpwBr_7KPg?si=2XC3Xw4zdmYLN-av&t=10",
    "https://youtu.be/tFpwBr_7KPg?si=Rw3RDb-N8V4Dm5yI&t=39",
    "https://youtu.be/tFpwBr_7KPg?si=mC4_uHgulB38cPTK",
    "https://youtu.be/tFpwBr_7KPg?si=uNAUqjL5XMXxelBw&t=19",
    "https://youtu.be/tsJMV9Gxw-o?si=RBV8vCl6CNAx22eD",
    "https://youtu.be/uFbNtqP966A?si=3mIG7OVH30gHjNhd",
    "https://youtu.be/ua0XuKwKQ9M?si=Y-kGNEq_riqAF2Tn",
    "https://youtu.be/vqQ9ok0dEgk",
    "https://youtu.be/w86Ph4iQgBM?si=IihE5X5en99z1H82",
    "https://youtu.be/xY3sQXYhk7A?si=DPCD_x4ApcM8y3uN",
    "https://youtu.be/yGnp0HU8BnA?si=g9lS7YfxwnBQ5gbR",
    "https://youtu.be/yv0aAY7M1mk?si=Z1Cx7ih-vWTSTqq-",
    "https://youtu.be/zDecGJLyVm8?si=VF-70ajNWU4cDHEV",
    "https://youtu.be/zGXvPjlgVkk?si=sTJq1mF8qaCapYbx",
    "https://www.youtube.com/watch?v=6G5DmVaocGM",
    "https://www.youtube.com/watch?v=BmYuAG2j2co",
    "https://www.youtube.com/watch?v=J2D2J7RO_tA",
    "https://www.youtube.com/watch?v=R2iUnBxFtis",
    "https://www.youtube.com/watch?v=VRwSgUoj7uI",
    "https://www.youtube.com/watch?v=b8fmEaXHapU",
    "https://www.youtube.com/watch?v=p2t9daxLpB8",
]

# Extract unique video IDs from PDF
pdf_video_ids = set()
for url in pdf_urls_raw:
    vid = extract_video_id(url)
    if vid:
        pdf_video_ids.add(vid)

print(f"PDF: {len(pdf_video_ids)} unique video IDs")

# ============================================================
# 2. Load code demo URLs
# ============================================================
code_urls = set()
for m in re.finditer(r"demoVideoUrl:\s*'(https?://[^']+)'", PROGRAM_TS):
    code_urls.add(m.group(1))

code_video_ids = set()
for url in code_urls:
    vid = extract_video_id(url)
    if vid:
        code_video_ids.add(vid)

print(f"Code: {len(code_video_ids)} unique video IDs in demoVideoUrl fields")

# ============================================================
# 3. Cross-reference: PDF video IDs not in code
# ============================================================
print("\n--- EXERCISE NAME -> DEMO URL MAP FROM CODE ---")
ex_name_pat = re.compile(r"'([^']+)':\s*\{[^}]*?demoVideoUrl:\s*'([^']*)'", re.DOTALL)
code_ex_map = {}
for m in ex_name_pat.finditer(PROGRAM_TS):
    name = m.group(1).replace('\\u00b0', '\u00b0')
    url = m.group(2)
    if url:
        code_ex_map[name] = url
        vid = extract_video_id(url)
        print(f"  {name}")
        print(f"    Code: {url}")
        print(f"    ID:   {vid}")

# Cross-reference: which PDF video IDs are NOT in code
only_in_pdf = pdf_video_ids - code_video_ids
only_in_code = code_video_ids - pdf_video_ids

print(f"\n{'='*60}")
print(f"LINK VERIFICATION RESULTS")
print(f"{'='*60}")
print(f"Total PDF video IDs: {len(pdf_video_ids)}")
print(f"Total Code video IDs: {len(code_video_ids)}")

if only_in_pdf:
    print(f"\n⚠️  IN PDF BUT NOT IN CODE ({len(only_in_pdf)} IDs):")
    for vid in sorted(only_in_pdf):
        print(f"  https://youtu.be/{vid}")
else:
    print(f"\n✅ ALL PDF video IDs are present in code")

if only_in_code:
    print(f"\n⚠️  IN CODE BUT NOT IN PDF ({len(only_in_code)} IDs):")
    for vid in sorted(only_in_code):
        print(f"  https://youtu.be/{vid}")
        # Find which exercise has this URL
        for name, url in code_ex_map.items():
            if vid in url:
                print(f"    -> {name}")
else:
    print(f"✅ ALL Code video IDs are present in PDF")

print(f"\n--- DETAILED EXERCISE BY EXERCISE ---")
# Now map PDF video IDs to code exercises to check for mismatches
# Create a reverse mapping of video ID -> exercise names
code_vid_to_ex = {}
for name, url in code_ex_map.items():
    vid = extract_video_id(url)
    if vid:
        if vid not in code_vid_to_ex:
            code_vid_to_ex[vid] = []
        code_vid_to_ex[vid].append(name)

# Check each exercise
for name, url in sorted(code_ex_map.items()):
    code_vid = extract_video_id(url)
    if code_vid in pdf_video_ids:
        print(f"  ✅ {name}")
        print(f"     {url}")
    else:
        print(f"  ❌ {name}")
        print(f"     Code: {url} (ID: {code_vid})")
        print(f"     NOT FOUND IN PDF")
