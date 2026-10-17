-- TravelMate Live Schema (Mission 3 Record)
-- Generated from live Supabase database

CREATE TABLE destinations (
  destination_id VARCHAR(20) PRIMARY KEY,
  destination_name VARCHAR(100) NOT NULL,
  region_country VARCHAR(150) NOT NULL
);

CREATE TABLE listings (
  listing_id VARCHAR(20) PRIMARY KEY,
  destination_id VARCHAR(20) REFERENCES destinations(destination_id),
  listing_type VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  address VARCHAR(200),
  image_url TEXT,
  average_rating NUMERIC,
  date_added DATE
);

CREATE TABLE attractions (
  attraction_id VARCHAR(20) PRIMARY KEY,
  destination_id VARCHAR(20) REFERENCES destinations(destination_id),
  activity_name VARCHAR(200) NOT NULL,
  schedule_id VARCHAR(20),
  coordinates VARCHAR(80)
);

CREATE TABLE hotels (
  hotel_id VARCHAR(20) PRIMARY KEY,
  destination_id VARCHAR(20) REFERENCES destinations(destination_id),
  hotel_name VARCHAR(200) NOT NULL,
  star_rating VARCHAR(20),
  address VARCHAR(200)
);

CREATE TABLE restaurants (
  restaurant_id VARCHAR(20) PRIMARY KEY,
  destination_id VARCHAR(20) REFERENCES destinations(destination_id),
  restaurant_name VARCHAR(200) NOT NULL,
  cuisine_type VARCHAR(100),
  address VARCHAR(200)
);

CREATE TABLE app_users (
  user_id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  password_hash TEXT NOT NULL,
  email VARCHAR(255) NOT NULL,
  sex VARCHAR(10),
  current_location VARCHAR(150),
  auth_user_id UUID
);

CREATE TABLE administrators (
  admin_id VARCHAR(20) PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  auth_user_id UUID
);

CREATE TABLE admin_tags (
  admin_id VARCHAR(20) REFERENCES administrators(admin_id),
  curation_tag VARCHAR(100) NOT NULL,
  PRIMARY KEY (admin_id, curation_tag)
);

CREATE TABLE reviews (
  review_id VARCHAR(20) PRIMARY KEY,
  listing_id VARCHAR(20) REFERENCES listings(listing_id),
  user_id VARCHAR(20) REFERENCES app_users(user_id),
  rating INTEGER NOT NULL,
  title VARCHAR(200),
  review_text TEXT NOT NULL,
  visit_date DATE,
  submission_date DATE,
  helpful_votes_count INTEGER
);

CREATE TABLE hotel_reviews (
  review_id VARCHAR(20) PRIMARY KEY,
  user_id VARCHAR(20) REFERENCES app_users(user_id),
  hotel_id VARCHAR(20) REFERENCES hotels(hotel_id),
  numerical_rating INTEGER NOT NULL,
  "Hotel_Reviews" TEXT NOT NULL
);

CREATE TABLE restaurant_reviews (
  review_id VARCHAR(20) PRIMARY KEY,
  user_id VARCHAR(20) REFERENCES app_users(user_id),
  restaurant_id VARCHAR(20) REFERENCES restaurants(restaurant_id),
  numerical_rating INTEGER NOT NULL,
  user_text_review TEXT NOT NULL
);

CREATE TABLE user_preferences (
  preference_id VARCHAR(20) PRIMARY KEY,
  user_id VARCHAR(20) REFERENCES app_users(user_id),
  budget_range VARCHAR(50) NOT NULL
);

CREATE TABLE search_logs (
  log_id VARCHAR(20) PRIMARY KEY,
  user_id VARCHAR(20) REFERENCES app_users(user_id),
  keywords VARCHAR(150) NOT NULL,
  activity_filters VARCHAR(100),
  search_count INTEGER NOT NULL
);

CREATE TABLE recommendations (
  recommendation_id VARCHAR(20) PRIMARY KEY,
  log_id VARCHAR(20) REFERENCES search_logs(log_id),
  listing_id VARCHAR(20) REFERENCES listings(listing_id),
  user_id VARCHAR(20) REFERENCES app_users(user_id),
  recommendation_score NUMERIC,
  recommendation_reason TEXT,
  date_generated DATE
);

CREATE TABLE trips (
  trip_id VARCHAR(20) PRIMARY KEY,
  user_id VARCHAR(20) REFERENCES app_users(user_id),
  trip_name VARCHAR(200) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(30),
  is_public BOOLEAN,
  date_created DATE
);

CREATE TABLE trip_items (
  trip_item_id VARCHAR(20) PRIMARY KEY,
  trip_id VARCHAR(20) REFERENCES trips(trip_id),
  listing_id VARCHAR(20) REFERENCES listings(listing_id),
  planned_date DATE,
  start_time TIME,
  end_time TIME,
  sequence_no INTEGER,
  notes TEXT
);

CREATE TABLE photos (
  photo_id VARCHAR(20) PRIMARY KEY,
  listing_id VARCHAR(20) REFERENCES listings(listing_id),
  uploaded_by VARCHAR(20) NOT NULL,
  photo_url VARCHAR NOT NULL,
  caption TEXT,
  upload_date DATE
);

CREATE TABLE schedules (
  schedule_id VARCHAR(20) PRIMARY KEY,
  open_time VARCHAR(10),
  close_time VARCHAR(10)
);
