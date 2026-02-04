const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get assessment data
app.get('/api/assessment/:pin', async (req, res) => {
  try {
    const { pin } = req.params;
    const url = `https://datacatalog.cookcountyil.gov/resource/uzyt-m557.json?pin=${pin}&$order=year DESC&$limit=10`;
    const response = await axios.get(url);
    res.json({ success: true, data: response.data, pin: pin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get commercial data
app.get('/api/commercial/:pin', async (req, res) => {
  try {
    const { pin } = req.params;
    const url = `https://datacatalog.cookcountyil.gov/resource/csik-bsws.json?pins=${pin}&$order=year DESC&$limit=10`;
    const response = await axios.get(url);
    res.json({ success: true, data: response.data, pin: pin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get both assessment and commercial data
app.get('/api/property/:pin', async (req, res) => {
  try {
    const { pin } = req.params;
    
    const [assessmentResponse, commercialResponse] = await Promise.allSettled([
      axios.get(`https://datacatalog.cookcountyil.gov/resource/uzyt-m557.json?pin=${pin}&$order=year DESC&$limit=10`),
      axios.get(`https://datacatalog.cookcountyil.gov/resource/csik-bsws.json?pins=${pin}&$order=year DESC&$limit=10`)
    ]);
    
    res.json({
      success: true,
      pin: pin,
      assessment: {
        success: assessmentResponse.status === 'fulfilled',
        data: assessmentResponse.status === 'fulfilled' ? assessmentResponse.value.data : []
      },
      commercial: {
        success: commercialResponse.status === 'fulfilled',
        data: commercialResponse.status === 'fulfilled' ? commercialResponse.value.data : []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch fetch
app.post('/api/properties/batch', async (req, res) => {
  try {
    const { pins } = req.body;
    
    if (!pins || !Array.isArray(pins)) {
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }
    
    const results = await Promise.allSettled(
      pins.map(async (pin) => {
        const [assessmentResponse, commercialResponse] = await Promise.allSettled([
          axios.get(`https://datacatalog.cookcountyil.gov/resource/uzyt-m557.json?pin=${pin}&$order=year DESC&$limit=10`),
          axios.get(`https://datacatalog.cookcountyil.gov/resource/csik-bsws.json?pins=${pin}&$order=year DESC&$limit=10`)
        ]);
        
        return {
          pin,
          assessment: {
            success: assessmentResponse.status === 'fulfilled',
            data: assessmentResponse.status === 'fulfilled' ? assessmentResponse.value.data : []
          },
          commercial: {
            success: commercialResponse.status === 'fulfilled',
            data: commercialResponse.status === 'fulfilled' ? commercialResponse.value.data : []
          }
        };
      })
    );
    
    const processedResults = results.map((result, index) => ({
      pin: pins[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null
    }));
    
    res.json({ success: true, results: processedResults });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server - IMPORTANT: bind to 0.0.0.0 for Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server started on port', PORT);
});
