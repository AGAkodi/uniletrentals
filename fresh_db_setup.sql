-- ============================================
-- FRESH DATABASE SETUP FOR UNILET RENTALS
-- Run this ONCE on a fresh Supabase database
-- ============================================

-- Step 1: Complete reset (in case there's anything)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Step 2: Install required extensions
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Step 3: Apply all migrations
-- ========================================
-- Migration: 20251219181244_remix_migration_from_pg_dump.sql
-- ========================================
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled',
    'completed'
);


--
-- Name: listing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'student',
    'agent',
    'admin'
);


--
-- Name: verification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.verification_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: generate_agent_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_agent_id() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_id TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(agent_id FROM 9) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.agent_verifications
  WHERE agent_id IS NOT NULL;
  
  new_id := 'UNL-AGT-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_id;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'student'),
    NEW.raw_user_meta_data ->> 'student_id'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'student')
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: public.has_role(uuid, public.user_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.user_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: agent_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_name text,
    government_id_url text,
    proof_of_ownership_url text,
    office_address text,
    passport_photo_url text,
    agent_id text,
    verification_status public.verification_status DEFAULT 'pending'::public.verification_status,
    verified_at timestamp with time zone,
    verified_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: blogs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blogs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    content text NOT NULL,
    cover_image text,
    author_id uuid,
    published boolean DEFAULT false,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    property_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    scheduled_date date NOT NULL,
    scheduled_time time without time zone NOT NULL,
    status public.booking_status DEFAULT 'pending'::public.booking_status,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    role public.user_role DEFAULT 'student'::public.user_role NOT NULL,
    student_id text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    currency text DEFAULT 'NGN'::text,
    address text NOT NULL,
    city text NOT NULL,
    state text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    bedrooms integer DEFAULT 1,
    bathrooms integer DEFAULT 1,
    amenities text[] DEFAULT '{}'::text[],
    images text[] DEFAULT '{}'::text[],
    whatsapp_number text,
    status public.listing_status DEFAULT 'pending'::public.listing_status,
    views_count integer DEFAULT 0,
    approved_at timestamp with time zone,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    reported_agent_id uuid,
    reported_property_id uuid,
    reason text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    property_id uuid,
    rating integer NOT NULL,
    comment text,
    is_moderated boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: saved_properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    property_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: saved_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_searches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    search_query jsonb NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.user_role NOT NULL
);


--
-- Name: agent_verifications agent_verifications_agent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_verifications
    ADD CONSTRAINT agent_verifications_agent_id_key UNIQUE (agent_id);


--
-- Name: agent_verifications agent_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_verifications
    ADD CONSTRAINT agent_verifications_pkey PRIMARY KEY (id);


--
-- Name: blogs blogs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT blogs_pkey PRIMARY KEY (id);


--
-- Name: blogs blogs_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT blogs_slug_key UNIQUE (slug);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: saved_properties saved_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_properties
    ADD CONSTRAINT saved_properties_pkey PRIMARY KEY (id);


--
-- Name: saved_properties saved_properties_user_id_property_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_properties
    ADD CONSTRAINT saved_properties_user_id_property_id_key UNIQUE (user_id, property_id);


--
-- Name: saved_searches saved_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: agent_verifications update_agent_verifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_verifications_updated_at BEFORE UPDATE ON public.agent_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blogs update_blogs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bookings update_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: properties update_properties_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews update_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_verifications agent_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_verifications
    ADD CONSTRAINT agent_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: agent_verifications agent_verifications_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_verifications
    ADD CONSTRAINT agent_verifications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id);


--
-- Name: blogs blogs_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT blogs_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: properties properties_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: properties properties_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: reports reports_reported_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reported_agent_id_fkey FOREIGN KEY (reported_agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reports reports_reported_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reported_property_id_fkey FOREIGN KEY (reported_property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reports reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id);


--
-- Name: reviews reviews_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: saved_properties saved_properties_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_properties
    ADD CONSTRAINT saved_properties_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: saved_properties saved_properties_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_properties
    ADD CONSTRAINT saved_properties_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: saved_searches saved_searches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: blogs Admins can delete blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete blogs" ON public.blogs FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.user_role));


--
-- Name: properties Admins can delete properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete properties" ON public.properties FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.user_role));


--
-- Name: reviews Admins can delete reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete reviews" ON public.reviews FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.user_role));


--
-- Name: blogs Admins can insert blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert blogs" ON public.blogs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'admin'::public.user_role));


--
-- Name: blogs Admins can update blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update blogs" ON public.blogs FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.user_role));


--
-- Name: reports Admins can update reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.user_role));


--
-- Name: agent_verifications Agents can insert own verification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can insert own verification" ON public.agent_verifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: properties Agents can insert properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can insert properties" ON public.properties FOR INSERT WITH CHECK ((auth.uid() = agent_id));


--
-- Name: properties Agents can update own properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can update own properties" ON public.properties FOR UPDATE USING (((auth.uid() = agent_id) OR public.has_role(auth.uid(), 'admin'::public.user_role)));


--
-- Name: agent_verifications Agents can update own verification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can update own verification" ON public.agent_verifications FOR UPDATE USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.user_role)));


--
-- Name: agent_verifications Agents can view own verification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can view own verification" ON public.agent_verifications FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.user_role)));


--
-- Name: properties Anyone can view approved properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved properties" ON public.properties FOR SELECT USING (((status = 'approved'::public.listing_status) OR (auth.uid() = agent_id) OR public.has_role(auth.uid(), 'admin'::public.user_role)));


--
-- Name: blogs Anyone can view published blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published blogs" ON public.blogs FOR SELECT USING (((published = true) OR public.has_role(auth.uid(), 'admin'::public.user_role)));


--
-- Name: reviews Anyone can view reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);


--
-- Name: profiles Profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: bookings Users and agents can update bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users and agents can update bookings" ON public.bookings FOR UPDATE USING (((auth.uid() = user_id) OR (auth.uid() = agent_id) OR public.has_role(auth.uid(), 'admin'::public.user_role)));


--
-- Name: bookings Users can create bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reports Users can create reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK ((auth.uid() = reporter_id));


--
-- Name: reviews Users can create reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: saved_searches Users can delete saved searches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete saved searches" ON public.saved_searches FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: saved_properties Users can save properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can save properties" ON public.saved_properties FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: saved_searches Users can save searches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can save searches" ON public.saved_searches FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: saved_properties Users can unsave properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unsave properties" ON public.saved_properties FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: reviews Users can update own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.user_role)));


--
-- Name: bookings Users can view own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() = agent_id) OR public.has_role(auth.uid(), 'admin'::public.user_role)));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: reports Users can view own reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (((auth.uid() = reporter_id) OR public.has_role(auth.uid(), 'admin'::public.user_role)));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.user_role)));


--
-- Name: saved_properties Users can view own saved properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own saved properties" ON public.saved_properties FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: saved_searches Users can view own saved searches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own saved searches" ON public.saved_searches FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: agent_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: blogs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: properties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_properties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_searches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;
-- ========================================
-- Migration: 20251222215859_29f2b7b2-6dbc-4763-a880-1cb8066b2024.sql
-- ========================================
-- Create storage policies for avatar uploads (skip if exists)
-- Note: The 'avatars' bucket already exists and is public

-- Drop existing policies if they exist and recreate with proper rules
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create policy for users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
-- ========================================
-- Migration: 20251223214739_150e6b15-2e50-4cba-9b66-c01b4f2b8a60.sql
-- ========================================
-- Add missing columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS recipient_role public.user_role,
ADD COLUMN IF NOT EXISTS link text;

-- Rename read to is_read for clarity (create new column, copy data, drop old)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
UPDATE public.notifications SET is_read = read WHERE is_read IS NULL;

-- Create function to notify admin on dispute submission
CREATE OR REPLACE FUNCTION public.notify_admin_on_report()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Notify all admins
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
    VALUES (admin_record.user_id, 'admin', 'dispute', 'New Dispute Submitted', 'A student has submitted a new dispute that requires your attention.', '/admin/reports', false);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify agent on booking
CREATE OR REPLACE FUNCTION public.notify_agent_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
  VALUES (NEW.agent_id, 'agent', 'booking', 'New Booking Request', 'A student has requested to book one of your properties.', '/agent/bookings', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify agent on listing approval
CREATE OR REPLACE FUNCTION public.notify_agent_on_listing_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Notify the agent
    INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
    VALUES (NEW.agent_id, 'agent', 'listing', 'Listing Approved', 'Your property listing "' || NEW.title || '" has been approved!', '/agent/listings', false);
    
    -- Notify all students about new listing
    INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
    SELECT ur.user_id, 'student', 'listing', 'New Listing Available', 'A new property is now available: ' || NEW.title, '/property/' || NEW.id, false
    FROM public.user_roles ur WHERE ur.role = 'student';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify agent on review
CREATE OR REPLACE FUNCTION public.notify_agent_on_review()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
  VALUES (NEW.agent_id, 'agent', 'review', 'New Review Received', 'A student has left a review for you.', '/agent/profile', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS on_report_created ON public.reports;
CREATE TRIGGER on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_report();

DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;
CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_agent_on_booking();

DROP TRIGGER IF EXISTS on_listing_approved ON public.properties;
CREATE TRIGGER on_listing_approved
  AFTER UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.notify_agent_on_listing_approval();

DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_agent_on_review();
-- ========================================
-- Migration: 20251223234344_a443473d-e14b-4f30-b085-aaf4b795c2d8.sql
-- ========================================
-- Add new columns to agent_verifications table for ZIP file support and rejection reason
ALTER TABLE public.agent_verifications 
ADD COLUMN IF NOT EXISTS zip_file_url text,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

-- Create notification trigger for when agent submits documents
CREATE OR REPLACE FUNCTION public.notify_admin_on_agent_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only trigger when documents are submitted (zip_file_url is set and verification_status is pending)
  IF NEW.zip_file_url IS NOT NULL AND (OLD.zip_file_url IS NULL OR NEW.zip_file_url != OLD.zip_file_url) THEN
    FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
      VALUES (admin_record.user_id, 'admin', 'verification', 'New Agent Verification Request', 
              'A new agent has submitted verification documents for review.', '/admin/verify-agents', false);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_agent_document_submission ON public.agent_verifications;
CREATE TRIGGER on_agent_document_submission
  AFTER UPDATE ON public.agent_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_agent_submission();

-- Create a trigger for when agent verification is approved or rejected
CREATE OR REPLACE FUNCTION public.notify_agent_on_verification_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if verification status changed
  IF OLD.verification_status = 'pending' AND NEW.verification_status = 'approved' THEN
    INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
    VALUES (NEW.user_id, 'agent', 'verification', 'Verification Approved!', 
            'Congratulations! Your agent account has been verified. Your Agent ID is ' || COALESCE(NEW.agent_id, 'N/A') || '. You can now list properties.',
            '/agent', false);
  ELSIF OLD.verification_status = 'pending' AND NEW.verification_status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
    VALUES (NEW.user_id, 'agent', 'verification', 'Verification Rejected', 
            COALESCE('Your verification was rejected: ' || NEW.rejection_reason, 'Your verification was rejected. Please upload clearer documents and try again.'),
            '/agent/verification', false);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_agent_verification_status_change ON public.agent_verifications;
CREATE TRIGGER on_agent_verification_status_change
  AFTER UPDATE ON public.agent_verifications
  FOR EACH ROW
  WHEN (OLD.verification_status IS DISTINCT FROM NEW.verification_status)
  EXECUTE FUNCTION public.notify_agent_on_verification_update();
-- ========================================
-- Migration: 20260101055221_329308d5-f706-41ba-96c3-f5b3859c33a2.sql
-- ========================================
-- Backfill user_roles from existing profiles.role so current accounts keep working
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role
FROM public.profiles p
WHERE p.role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;
-- ========================================
-- Migration: 20260101072422_57afcceb-b3f5-4213-9fa4-4a9281ab3803.sql
-- ========================================
-- Drop the trigger if it exists to recreate it properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the handle_new_user function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name, email, phone, role, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'student'),
    NEW.raw_user_meta_data ->> 'student_id'
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'student')
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Note: Removed hardcoded user inserts since this is a fresh database
-- Users will be created automatically when they sign up via the app
-- ========================================
-- Migration: 20260102042947_cedd186b-9bf5-4b5a-af29-70cd13578fc4.sql
-- ========================================
-- Allow agents to delete bookings for their properties
CREATE POLICY "Agents can delete bookings"
ON public.bookings
FOR DELETE
USING (auth.uid() = agent_id OR public.has_role(auth.uid(), 'admin'::public.user_role));
-- ========================================
-- Migration: 20260102050411_a5f854cf-6d51-444a-b9e9-93c7184d0f6d.sql
-- ========================================
-- Create shared_rentals table
CREATE TABLE public.shared_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  host_student_id UUID NOT NULL,
  gender_preference TEXT NOT NULL CHECK (gender_preference IN ('male', 'female', 'any')),
  total_rent NUMERIC NOT NULL,
  rent_split NUMERIC NOT NULL,
  description TEXT,
  move_in_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_rentals ENABLE ROW LEVEL SECURITY;

-- Anyone can view active shared rentals
CREATE POLICY "Anyone can view active shared rentals"
ON public.shared_rentals
FOR SELECT
USING (status = 'active' OR auth.uid() = host_student_id OR public.has_role(auth.uid(), 'admin'::public.user_role));

-- Verified students can create shared rentals
CREATE POLICY "Verified students can create shared rentals"
ON public.shared_rentals
FOR INSERT
WITH CHECK (
  auth.uid() = host_student_id 
  AND public.has_role(auth.uid(), 'student'::public.user_role)
);

-- Host students can update their own shared rentals
CREATE POLICY "Host students can update own shared rentals"
ON public.shared_rentals
FOR UPDATE
USING (auth.uid() = host_student_id OR public.has_role(auth.uid(), 'admin'::public.user_role));

-- Host students and admins can delete shared rentals
CREATE POLICY "Host students and admins can delete shared rentals"
ON public.shared_rentals
FOR DELETE
USING (auth.uid() = host_student_id OR public.has_role(auth.uid(), 'admin'::public.user_role));

-- Create updated_at trigger
CREATE TRIGGER update_shared_rentals_updated_at
BEFORE UPDATE ON public.shared_rentals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create shared_rental_interests table
CREATE TABLE public.shared_rental_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_rental_id UUID NOT NULL REFERENCES public.shared_rentals(id) ON DELETE CASCADE,
  interested_student_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shared_rental_id, interested_student_id)
);

-- Enable RLS
ALTER TABLE public.shared_rental_interests ENABLE ROW LEVEL SECURITY;

-- Students can view interests on their shared rentals or their own interests
CREATE POLICY "View interests"
ON public.shared_rental_interests
FOR SELECT
USING (
  auth.uid() = interested_student_id 
  OR EXISTS (
    SELECT 1 FROM public.shared_rentals 
    WHERE id = shared_rental_id AND host_student_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.user_role)
);

-- Students can express interest
CREATE POLICY "Students can express interest"
ON public.shared_rental_interests
FOR INSERT
WITH CHECK (
  auth.uid() = interested_student_id 
  AND public.has_role(auth.uid(), 'student'::public.user_role)
);

-- Students can remove their interest
CREATE POLICY "Students can remove interest"
ON public.shared_rental_interests
FOR DELETE
USING (auth.uid() = interested_student_id);

-- Create notification trigger for interest
CREATE OR REPLACE FUNCTION public.notify_host_on_interest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  host_id UUID;
  property_title TEXT;
BEGIN
  -- Get host student id and property title
  SELECT sr.host_student_id, p.title
  INTO host_id, property_title
  FROM public.shared_rentals sr
  JOIN public.properties p ON p.id = sr.property_id
  WHERE sr.id = NEW.shared_rental_id;
  
  -- Create notification for host
  INSERT INTO public.notifications (user_id, recipient_role, type, title, message, link, is_read)
  VALUES (
    host_id, 
    'student', 
    'interest', 
    'New Interest in Your Shared Rental',
    'A student is interested in your shared rental listing for "' || property_title || '".',
    '/student/shared',
    false
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_shared_rental_interest
AFTER INSERT ON public.shared_rental_interests
FOR EACH ROW
EXECUTE FUNCTION public.notify_host_on_interest();
-- ========================================
-- Migration: 20260102051238_9cf1726f-7e61-4893-befc-50675a9f2a57.sql
-- ========================================
-- Add religion_preference column to shared_rentals
ALTER TABLE public.shared_rentals 
ADD COLUMN religion_preference TEXT CHECK (religion_preference IN ('any', 'christian', 'muslim', 'other'))
DEFAULT 'any';
-- ========================================
-- Migration: 20260102054702_a86be14f-3ad7-44cb-97bd-dd775b83ada3.sql
-- ========================================
-- Add contact_clicks column to properties table to track contact button clicks
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS contact_clicks integer DEFAULT 0;
-- ========================================
-- Migration: 20260110100900_0ed8d000-e5c5-4cf0-904b-5bf47cf26b1a.sql
-- ========================================
-- Update the generate_agent_id function to use "ULT-AGT-" prefix
CREATE OR REPLACE FUNCTION public.generate_agent_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_id TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(agent_id FROM 9) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.agent_verifications
  WHERE agent_id IS NOT NULL;
  
  new_id := 'ULT-AGT-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_id;
END;
$function$;
-- ========================================
-- Migration: 20260110101603_45f11ed2-8744-4838-a00a-fce45f7ddd06.sql
-- ========================================
-- Add suspension fields to agent_verifications table
ALTER TABLE public.agent_verifications
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspension_reason text,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id);
-- ========================================
-- Migration: 20260113003702_cd7e0467-5036-4247-a12d-5b05d61105a3.sql
-- ========================================
-- Create trigger function to create agent_verification record for new agents
CREATE OR REPLACE FUNCTION public.handle_new_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is an agent (from the user_roles table which was just inserted)
  IF NEW.role = 'agent' THEN
    -- Insert verification record if it doesn't exist
    INSERT INTO public.agent_verifications (user_id, verification_status)
    VALUES (NEW.user_id, 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on user_roles table (which is populated when users sign up)
DROP TRIGGER IF EXISTS on_agent_role_created ON public.user_roles;
CREATE TRIGGER on_agent_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_agent();

-- Add unique constraint on user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agent_verifications_user_id_key'
  ) THEN
    ALTER TABLE public.agent_verifications ADD CONSTRAINT agent_verifications_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Create verification records for existing agents who don't have one
INSERT INTO public.agent_verifications (user_id, verification_status)
SELECT ur.user_id, 'pending'
FROM public.user_roles ur
WHERE ur.role = 'agent'
AND NOT EXISTS (
  SELECT 1 FROM public.agent_verifications av WHERE av.user_id = ur.user_id
);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Your database now has:
-- ✅ All tables (profiles, properties, bookings, agent_verifications, etc.)
-- ✅ All functions and triggers
-- ✅ All RLS policies
-- ✅ All constraints and relationships
-- ✅ Notification system
-- ✅ Shared rentals feature
-- ✅ Agent verification system
-- 
-- Next step: Test your application!
-- ============================================
