
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # 1. Homepage Desktop
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        try:
            print("Navigating to Homepage (Desktop)...")
            await page.goto("http://localhost:3000/", timeout=60000)
            await page.wait_for_timeout(2000)
            await page.screenshot(path="homepage_desktop.png")
            print("Captured homepage_desktop.png")
        except Exception as e:
            print(f"Failed homepage desktop: {e}")

        # 2. Homepage Mobile (Menu Closed)
        page_mobile = await browser.new_page(viewport={'width': 375, 'height': 667})
        try:
            print("Navigating to Homepage (Mobile)...")
            await page_mobile.goto("http://localhost:3000/", timeout=60000)
            await page_mobile.wait_for_timeout(2000)
            await page_mobile.screenshot(path="homepage_mobile.png")
            print("Captured homepage_mobile.png")

            # 3. Homepage Mobile (Menu Open)
            # await page_mobile.click("button.mobile-menu-btn")
            # await page_mobile.wait_for_timeout(1000)
            # await page_mobile.screenshot(path="homepage_mobile_menu.png")
            # print("Captured homepage_mobile_menu.png")
        except Exception as e:
            print(f"Failed homepage mobile: {e}")

        # 4. Docs Desktop
        page_docs = await browser.new_page(viewport={'width': 1280, 'height': 800})
        try:
            print("Navigating to Docs (Desktop)...")
            await page_docs.goto("http://localhost:3000/docs/getting-started", timeout=60000)
            # await page_docs.wait_for_selector(".doc-sidebar", state="visible", timeout=10000)
            await page_docs.wait_for_timeout(3000)
            await page_docs.screenshot(path="docs_desktop.png")
            print("Captured docs_desktop.png")
        except Exception as e:
            print(f"Failed docs desktop: {e}")

        # 5. Docs Mobile
        page_docs_mobile = await browser.new_page(viewport={'width': 375, 'height': 667})
        try:
            print("Navigating to Docs (Mobile)...")
            await page_docs_mobile.goto("http://localhost:3000/docs/getting-started", timeout=60000)
            await page_docs_mobile.wait_for_timeout(3000)
            await page_docs_mobile.screenshot(path="docs_mobile.png")
            print("Captured docs_mobile.png")
        except Exception as e:
            print(f"Failed docs mobile: {e}")

        # 6. Signup Desktop
        page_signup = await browser.new_page(viewport={'width': 1280, 'height': 800})
        try:
            print("Navigating to Signup (Desktop)...")
            await page_signup.goto("http://localhost:3000/signup", timeout=60000)
            await page_signup.wait_for_timeout(2000)
            await page_signup.screenshot(path="signup_desktop.png")
            print("Captured signup_desktop.png")
        except Exception as e:
            print(f"Failed signup desktop: {e}")

        # 7. Signup Mobile
        page_signup_mobile = await browser.new_page(viewport={'width': 375, 'height': 667})
        try:
            print("Navigating to Signup (Mobile)...")
            await page_signup_mobile.goto("http://localhost:3000/signup", timeout=60000)
            await page_signup_mobile.wait_for_timeout(2000)
            await page_signup_mobile.screenshot(path="signup_mobile.png")
            print("Captured signup_mobile.png")
        except Exception as e:
            print(f"Failed signup mobile: {e}")


        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
