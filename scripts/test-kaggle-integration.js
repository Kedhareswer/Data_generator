// Test script to verify Kaggle API integration
async function testKaggleIntegration() {
  console.log("Testing Kaggle API integration...")

  const kaggleUsername = process.env.KAGGLE_USERNAME
  const kaggleApiKey = process.env.KAGGLE_API_KEY

  if (!kaggleUsername || !kaggleApiKey) {
    console.log("❌ Kaggle credentials not found in environment variables")
    console.log("Please set KAGGLE_USERNAME and KAGGLE_API_KEY")
    return
  }

  try {
    // Test basic API connectivity
    const response = await fetch("https://www.kaggle.com/api/v1/datasets/list?search=movies&size=5", {
      headers: {
        Authorization: `Bearer ${kaggleUsername}:${kaggleApiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log("✅ Kaggle API connection successful")
      console.log(`Found ${data.datasets?.length || 0} movie datasets`)

      if (data.datasets && data.datasets.length > 0) {
        console.log("Sample datasets:")
        data.datasets.slice(0, 3).forEach((dataset, index) => {
          console.log(`  ${index + 1}. ${dataset.title} (${dataset.ref})`)
        })
      }
    } else {
      console.log("❌ Kaggle API request failed:", response.status, response.statusText)
    }
  } catch (error) {
    console.log("❌ Error testing Kaggle integration:", error.message)
  }
}

// Run the test
testKaggleIntegration()
