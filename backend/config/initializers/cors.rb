Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      # Comma-separated list, e.g. CORS_ORIGINS=https://twinsoul.example.workers.dev
      origins(*ENV.fetch('CORS_ORIGINS', 'http://localhost:3001').split(',').map(&:strip))
  
      resource '*',
        headers: :any,
        methods: [:get, :post, :put, :patch, :delete, :options, :head]
    end
  end