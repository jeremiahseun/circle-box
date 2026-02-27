
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # 1. Login Page
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        try:
            print("Navigating to Login...")
            await page.goto("http://localhost:3000/login", timeout=60000)
            await page.wait_for_selector(".login-card", state="visible", timeout=10000)
            await page.screenshot(path="login_page_redesigned.png")
            print("Captured login_page_redesigned.png")
        except Exception as e:
            print(f"Failed login page: {e}")

        # Note: We can't easily test the dashboard authentication flow without a real backend/db in this environment
        # unless we mock the auth or have a test user.
        # For this verification step, we will rely on the visual correctness of the login page and the successful build.
        # The user can verify the full flow.

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
