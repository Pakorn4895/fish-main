import asyncio
from bleak import BleakScanner

async def run():
    print("Scanning for 10 seconds...")
    devices = await BleakScanner.discover(timeout=10.0)
    print(f"Found {len(devices)} devices:")
    for d in devices:
        print(f"Name: {d.name}, Address: {d.address}")

if __name__ == "__main__":
    asyncio.run(run())
