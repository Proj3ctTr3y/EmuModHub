import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Components
const Header = ({ onSearch, searchQuery, setSearchQuery }) => {
  return (
    <header className="bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-lg">
              🎮
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">EmuMod Hub</h1>
              <p className="text-gray-300 text-sm">Emulation & Game Modding Tutorials</p>
            </div>
          </div>
          
          <div className="w-full md:w-96">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tutorials, consoles, emulators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                🔍
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 text-white overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/9100862/pexels-photo-9100862.jpeg)'
        }}
      ></div>
      
      {/* Content */}
      <div className="relative container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Master Emulation & Game Modding
          </h2>
          <p className="text-xl md:text-2xl mb-8 text-gray-300">
            Comprehensive tutorials for emulators, game mods, and retro gaming setup. 
            From RetroArch to modern console emulation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-3 rounded-lg font-semibold text-lg transition duration-300">
              Browse Tutorials
            </button>
            <button className="bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 px-8 py-3 rounded-lg font-semibold text-lg transition duration-300">
              Submit Tutorial
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const TutorialCard = ({ tutorial, onClick }) => {
  const getYouTubeEmbed = (videoSources) => {
    const youtubeSource = videoSources.find(vs => vs.type === 'youtube' && vs.video_id);
    return youtubeSource ? `https://img.youtube.com/vi/${youtubeSource.video_id}/maxresdefault.jpg` : null;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const thumbnailUrl = getYouTubeEmbed(tutorial.video_sources);

  return (
    <div 
      className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
      onClick={() => onClick(tutorial)}
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-gray-700 to-gray-900">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={tutorial.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-6xl">
            🎮
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${getDifficultyColor(tutorial.difficulty)}`}>
            {tutorial.difficulty}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-purple-400 text-sm font-medium">{tutorial.console}</span>
          <span className="text-blue-400 text-sm">{tutorial.views} views</span>
        </div>
        
        <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">{tutorial.title}</h3>
        <p className="text-gray-400 text-sm mb-3 line-clamp-3">{tutorial.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">{tutorial.emulator}</span>
            <span className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">{tutorial.category}</span>
          </div>
          <span className="text-gray-500 text-xs">by {tutorial.author}</span>
        </div>
      </div>
    </div>
  );
};

const TutorialModal = ({ tutorial, onClose }) => {
  if (!tutorial) return null;

  const renderVideoSources = () => {
    return tutorial.video_sources.map((videoSource, index) => {
      if (videoSource.type === 'youtube' && videoSource.video_id) {
        return (
          <div key={index} className="mb-6">
            <div className="aspect-w-16 aspect-h-9 mb-4">
              <iframe
                src={`https://www.youtube.com/embed/${videoSource.video_id}`}
                title={`Video ${index + 1}`}
                className="w-full h-64 md:h-96 rounded-lg"
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </div>
            {videoSource.attribution && (
              <p className="text-sm text-gray-400 italic">
                Video source: YouTube - <a href={videoSource.attribution.watch_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  Watch on YouTube
                </a>
              </p>
            )}
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">{tutorial.title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Metadata */}
          <div className="flex flex-wrap gap-4 mb-6">
            <span className="bg-purple-600 px-3 py-1 rounded text-white text-sm">{tutorial.console}</span>
            <span className="bg-blue-600 px-3 py-1 rounded text-white text-sm">{tutorial.emulator}</span>
            <span className="bg-green-600 px-3 py-1 rounded text-white text-sm">{tutorial.category}</span>
            <span className="bg-yellow-600 px-3 py-1 rounded text-white text-sm">{tutorial.difficulty}</span>
          </div>

          <p className="text-gray-300 mb-6">{tutorial.description}</p>

          {/* Videos */}
          {tutorial.video_sources && tutorial.video_sources.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-4">Video Tutorials</h3>
              {renderVideoSources()}
            </div>
          )}

          {/* Tutorial Content */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">Tutorial Content</h3>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-300 whitespace-pre-wrap">{tutorial.content}</div>
            </div>
          </div>

          {/* Tags */}
          {tutorial.tags && tutorial.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-white mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tutorial.tags.map((tag, index) => (
                  <span key={index} className="bg-gray-700 px-2 py-1 rounded text-sm text-gray-300">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Author & Stats */}
          <div className="flex items-center justify-between text-gray-400 text-sm pt-4 border-t border-gray-700">
            <span>By {tutorial.author}</span>
            <div className="flex items-center space-x-4">
              <span>{tutorial.views} views</span>
              <span>Created: {new Date(tutorial.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterBar = ({ filters, onFilterChange, metadata }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select 
          value={filters.console} 
          onChange={(e) => onFilterChange('console', e.target.value)}
          className="bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Consoles</option>
          {metadata.consoles?.map(console => (
            <option key={console} value={console}>{console}</option>
          ))}
        </select>

        <select 
          value={filters.emulator} 
          onChange={(e) => onFilterChange('emulator', e.target.value)}
          className="bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Emulators</option>
          {metadata.emulators?.map(emulator => (
            <option key={emulator} value={emulator}>{emulator}</option>
          ))}
        </select>

        <select 
          value={filters.category} 
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Categories</option>
          {metadata.categories?.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <select 
          value={filters.difficulty} 
          onChange={(e) => onFilterChange('difficulty', e.target.value)}
          className="bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Difficulties</option>
          {metadata.difficulties?.map(difficulty => (
            <option key={difficulty} value={difficulty}>{difficulty}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

function App() {
  const [tutorials, setTutorials] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTutorial, setSelectedTutorial] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    console: '',
    emulator: '',
    category: '',
    difficulty: ''
  });

  // Fetch tutorials
  const fetchTutorials = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await axios.get(`${API}/tutorials?${queryParams}`);
      setTutorials(response.data);
    } catch (error) {
      console.error('Error fetching tutorials:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch metadata
  const fetchMetadata = async () => {
    try {
      const response = await axios.get(`${API}/metadata`);
      setMetadata(response.data);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  // Search tutorials
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchTutorials();
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/search?q=${encodeURIComponent(searchQuery)}`);
      setTutorials(response.data);
    } catch (error) {
      console.error('Error searching tutorials:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Load initial data
  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTutorials();
  }, [filters]);

  // Add some sample data for demonstration
  useEffect(() => {
    const addSampleData = async () => {
      try {
        // Check if we already have tutorials
        const existing = await axios.get(`${API}/tutorials?limit=1`);
        if (existing.data.length > 0) return;

        // Add sample tutorials
        const sampleTutorials = [
          {
            title: "Complete RetroArch Setup Guide for Beginners",
            description: "Learn how to set up RetroArch from scratch, configure cores, and start playing your favorite retro games.",
            console: "Multi-Console",
            emulator: "RetroArch",
            category: "Setup & Installation",
            difficulty: "Beginner",
            content: `# RetroArch Setup Guide

## Step 1: Download and Installation
1. Visit the official RetroArch website
2. Download the appropriate version for your system
3. Install following the setup wizard

## Step 2: Core Installation
1. Open RetroArch
2. Go to Online Updater
3. Download the cores for your desired systems

## Step 3: BIOS Setup
1. Create a 'system' folder in your RetroArch directory
2. Place required BIOS files in this folder
3. Verify BIOS detection in RetroArch

## Step 4: ROM Loading
1. Go to Load Content
2. Navigate to your ROM files
3. Select appropriate core when prompted

## Tips for Success:
- Always use legally obtained ROMs
- Keep your cores updated
- Configure input settings for best experience`,
            video_sources: [
              {
                type: "youtube",
                url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                video_id: "dQw4w9WgXcQ",
                attribution: {
                  platform: "YouTube",
                  video_id: "dQw4w9WgXcQ",
                  embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                  watch_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                  attribution_required: true
                }
              }
            ],
            tags: ["retroarch", "setup", "beginner", "cores"],
            author: "EmuMod Team"
          },
          {
            title: "PCSX2 PS2 Emulation: Performance Optimization",
            description: "Advanced techniques to optimize PCSX2 performance and achieve smooth PS2 emulation on modern hardware.",
            console: "PlayStation 2",
            emulator: "PCSX2",
            category: "Performance Optimization",
            difficulty: "Advanced",
            content: `# PCSX2 Performance Guide

## Hardware Requirements
- CPU: Intel i5 or AMD Ryzen 5 minimum
- GPU: GTX 1060 or RX 580 minimum
- RAM: 8GB minimum

## Essential Settings
1. **EE/IOP Tab:**
   - Enable MTVU (Multi-Threaded microVU1)
   - Set EE Cyclerate to 2 or 3 for demanding games

2. **VUs Tab:**
   - Enable microVU0 and microVU1
   - Enable MTVU for multi-core CPUs

3. **GS Tab:**
   - Use OpenGL or Vulkan renderer
   - Set internal resolution based on your GPU
   - Enable texture filtering

## Game-Specific Patches
Many games require specific patches for optimal performance:
- Shadow of the Colossus: EE Cyclerate +2
- God of War: VU Cycle Stealing +1
- Final Fantasy XII: Skip MPEG hack

## Troubleshooting Common Issues
- Audio crackling: Adjust audio latency
- Slowdowns: Lower internal resolution
- Graphical glitches: Try different renderers`,
            video_sources: [],
            tags: ["pcsx2", "ps2", "performance", "optimization"],
            author: "Performance Pro"
          }
        ];

        for (const tutorial of sampleTutorials) {
          await axios.post(`${API}/tutorials`, tutorial);
        }
        
        fetchTutorials();
      } catch (error) {
        console.error('Error adding sample data:', error);
      }
    };

    setTimeout(addSampleData, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header 
        onSearch={handleSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <Hero />

      <main className="container mx-auto px-4 py-8">
        <FilterBar 
          filters={filters}
          onFilterChange={handleFilterChange}
          metadata={metadata}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-white text-xl">Loading tutorials...</div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Latest Tutorials'}
              </h2>
              <span className="text-gray-400">
                {tutorials.length} tutorial{tutorials.length !== 1 ? 's' : ''}
              </span>
            </div>

            {tutorials.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎮</div>
                <h3 className="text-xl text-white mb-2">No tutorials found</h3>
                <p className="text-gray-400">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tutorials.map((tutorial) => (
                  <TutorialCard
                    key={tutorial.id}
                    tutorial={tutorial}
                    onClick={setSelectedTutorial}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {selectedTutorial && (
        <TutorialModal
          tutorial={selectedTutorial}
          onClose={() => setSelectedTutorial(null)}
        />
      )}

      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-xl font-bold mb-2">EmuMod Hub</h3>
          <p className="text-gray-400 mb-4">Your comprehensive guide to emulation and game modding</p>
          <div className="flex justify-center space-x-6">
            <a href="#" className="text-gray-400 hover:text-white">About</a>
            <a href="#" className="text-gray-400 hover:text-white">Submit Tutorial</a>
            <a href="#" className="text-gray-400 hover:text-white">Community</a>
            <a href="#" className="text-gray-400 hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;