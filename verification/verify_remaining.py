
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # 1. Verify Desktop Docs
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        try:
            print("Navigating to Docs (Desktop)...")
            await page.goto("http://localhost:3000/docs/getting-started", timeout=60000)
            await page.wait_for_selector("aside", state="visible", timeout=10000) # Sidebar
            await page.wait_for_selector("article", state="visible", timeout=10000) # Content
            await page.screenshot(path="docs_desktop_verified.png")
            print("Captured docs_desktop_verified.png")
        except Exception as e:
            print(f"Failed docs desktop: {e}")

        # 2. Verify Mobile Homepage Menu
        page_mobile = await browser.new_page(viewport={'width': 375, 'height': 667})
        try:
            print("Navigating to Homepage (Mobile)...")
            await page_mobile.goto("http://localhost:3000/", timeout=60000)

            # Click the menu button
            print("Waiting for menu button...")
            await page_mobile.wait_for_selector("button.mobile-menu-btn", state="visible", timeout=10000)
            await page_mobile.click("button.mobile-menu-btn")

            # Wait for nav to open
            print("Waiting for mobile nav to open...")
            await page_mobile.wait_for_selector(".mobile-nav.open", state="visible", timeout=5000)

            await page_mobile.screenshot(path="homepage_mobile_menu_open.png")
            print("Captured homepage_mobile_menu_open.png")
        except Exception as e:
            print(f"Failed homepage mobile: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
