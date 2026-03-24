CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

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
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'gestionnaire',
    'viewer'
);


--
-- Name: categorie_depense; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.categorie_depense AS ENUM (
    'reparation',
    'electricite',
    'eau',
    'vidange',
    'autre'
);


--
-- Name: statut_bien; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.statut_bien AS ENUM (
    'disponible',
    'occupe'
);


--
-- Name: statut_contrat; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.statut_contrat AS ENUM (
    'actif',
    'termine'
);


--
-- Name: statut_paiement; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.statut_paiement AS ENUM (
    'paye',
    'en_attente',
    'retard'
);


--
-- Name: type_bien; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.type_bien AS ENUM (
    'maison',
    'boutique',
    'chambre',
    'magasin'
);


--
-- Name: type_paiement; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.type_paiement AS ENUM (
    'loyer',
    'avance',
    'caution'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Check if this is the first user
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Default role for new users is 'viewer'
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  );
$$;


SET default_table_access_method = heap;

--
-- Name: biens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom text NOT NULL,
    type public.type_bien NOT NULL,
    adresse text NOT NULL,
    proprietaire_id uuid NOT NULL,
    loyer_mensuel numeric(10,2) NOT NULL,
    statut public.statut_bien DEFAULT 'disponible'::public.statut_bien NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT biens_loyer_mensuel_check CHECK ((loyer_mensuel >= (0)::numeric))
);


--
-- Name: contrats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contrats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    locataire_id uuid NOT NULL,
    bien_id uuid NOT NULL,
    date_debut date NOT NULL,
    date_fin date,
    loyer_mensuel numeric(10,2) NOT NULL,
    caution numeric(10,2) DEFAULT 0 NOT NULL,
    avance_mois integer DEFAULT 0 NOT NULL,
    statut public.statut_contrat DEFAULT 'actif'::public.statut_contrat NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contrats_avance_mois_check CHECK ((avance_mois >= 0)),
    CONSTRAINT contrats_caution_check CHECK ((caution >= (0)::numeric)),
    CONSTRAINT contrats_loyer_mensuel_check CHECK ((loyer_mensuel >= (0)::numeric))
);


--
-- Name: depenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bien_id uuid NOT NULL,
    categorie public.categorie_depense NOT NULL,
    description text NOT NULL,
    montant numeric(10,2) NOT NULL,
    date_depense date DEFAULT CURRENT_DATE NOT NULL,
    recu_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT depenses_montant_check CHECK ((montant > (0)::numeric))
);


--
-- Name: locataires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locataires (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom text NOT NULL,
    telephone text NOT NULL,
    email text,
    adresse text,
    piece_identite text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    locataire_id uuid,
    date_envoi timestamp with time zone DEFAULT now() NOT NULL,
    statut text DEFAULT 'en_attente'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    date_reception timestamp with time zone,
    recu_par text,
    canal_envoi text DEFAULT 'systeme'::text,
    tentatives_envoi integer DEFAULT 1,
    dernier_erreur text,
    CONSTRAINT notifications_canal_envoi_check CHECK ((canal_envoi = ANY (ARRAY['systeme'::text, 'email'::text, 'sms'::text, 'whatsapp'::text])))
);


--
-- Name: paiements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paiements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contrat_id uuid NOT NULL,
    locataire_id uuid NOT NULL,
    bien_id uuid NOT NULL,
    montant numeric(10,2) NOT NULL,
    type public.type_paiement NOT NULL,
    mois_concerne date,
    date_paiement date DEFAULT CURRENT_DATE NOT NULL,
    statut public.statut_paiement DEFAULT 'paye'::public.statut_paiement NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT paiements_montant_check CHECK ((montant > (0)::numeric))
);


--
-- Name: proprietaires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proprietaires (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom text NOT NULL,
    telephone text NOT NULL,
    email text,
    adresse text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: biens biens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biens
    ADD CONSTRAINT biens_pkey PRIMARY KEY (id);


--
-- Name: contrats contrats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrats
    ADD CONSTRAINT contrats_pkey PRIMARY KEY (id);


--
-- Name: depenses depenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depenses
    ADD CONSTRAINT depenses_pkey PRIMARY KEY (id);


--
-- Name: locataires locataires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locataires
    ADD CONSTRAINT locataires_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: paiements paiements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_pkey PRIMARY KEY (id);


--
-- Name: proprietaires proprietaires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proprietaires
    ADD CONSTRAINT proprietaires_pkey PRIMARY KEY (id);


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
-- Name: idx_biens_proprietaire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biens_proprietaire ON public.biens USING btree (proprietaire_id);


--
-- Name: idx_biens_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biens_statut ON public.biens USING btree (statut);


--
-- Name: idx_contrats_bien; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrats_bien ON public.contrats USING btree (bien_id);


--
-- Name: idx_contrats_locataire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrats_locataire ON public.contrats USING btree (locataire_id);


--
-- Name: idx_contrats_statut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrats_statut ON public.contrats USING btree (statut);


--
-- Name: idx_depenses_bien; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_depenses_bien ON public.depenses USING btree (bien_id);


--
-- Name: idx_depenses_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_depenses_date ON public.depenses USING btree (date_depense);


--
-- Name: idx_notifications_date_reception; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_date_reception ON public.notifications USING btree (date_reception);


--
-- Name: idx_notifications_locataire_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_locataire_date ON public.notifications USING btree (locataire_id, date_envoi DESC);


--
-- Name: idx_paiements_bien; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paiements_bien ON public.paiements USING btree (bien_id);


--
-- Name: idx_paiements_contrat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paiements_contrat ON public.paiements USING btree (contrat_id);


--
-- Name: idx_paiements_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paiements_date ON public.paiements USING btree (date_paiement);


--
-- Name: idx_paiements_locataire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paiements_locataire ON public.paiements USING btree (locataire_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: biens set_updated_at_biens; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_biens BEFORE UPDATE ON public.biens FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: contrats set_updated_at_contrats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_contrats BEFORE UPDATE ON public.contrats FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: depenses set_updated_at_depenses; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_depenses BEFORE UPDATE ON public.depenses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: locataires set_updated_at_locataires; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_locataires BEFORE UPDATE ON public.locataires FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: paiements set_updated_at_paiements; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_paiements BEFORE UPDATE ON public.paiements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: proprietaires set_updated_at_proprietaires; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_proprietaires BEFORE UPDATE ON public.proprietaires FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: biens biens_proprietaire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biens
    ADD CONSTRAINT biens_proprietaire_id_fkey FOREIGN KEY (proprietaire_id) REFERENCES public.proprietaires(id) ON DELETE RESTRICT;


--
-- Name: contrats contrats_bien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrats
    ADD CONSTRAINT contrats_bien_id_fkey FOREIGN KEY (bien_id) REFERENCES public.biens(id) ON DELETE RESTRICT;


--
-- Name: contrats contrats_locataire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrats
    ADD CONSTRAINT contrats_locataire_id_fkey FOREIGN KEY (locataire_id) REFERENCES public.locataires(id) ON DELETE RESTRICT;


--
-- Name: depenses depenses_bien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depenses
    ADD CONSTRAINT depenses_bien_id_fkey FOREIGN KEY (bien_id) REFERENCES public.biens(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_locataire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_locataire_id_fkey FOREIGN KEY (locataire_id) REFERENCES public.locataires(id) ON DELETE CASCADE;


--
-- Name: paiements paiements_bien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_bien_id_fkey FOREIGN KEY (bien_id) REFERENCES public.biens(id) ON DELETE RESTRICT;


--
-- Name: paiements paiements_contrat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_contrat_id_fkey FOREIGN KEY (contrat_id) REFERENCES public.contrats(id) ON DELETE RESTRICT;


--
-- Name: paiements paiements_locataire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_locataire_id_fkey FOREIGN KEY (locataire_id) REFERENCES public.locataires(id) ON DELETE RESTRICT;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications Authenticated users can view notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view notifications" ON public.notifications FOR SELECT TO authenticated USING (true);


--
-- Name: notifications Only admins can manage notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage notifications" ON public.notifications TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Only admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: biens Public can delete biens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can delete biens" ON public.biens FOR DELETE USING (true);


--
-- Name: contrats Public can delete contrats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can delete contrats" ON public.contrats FOR DELETE USING (true);


--
-- Name: depenses Public can delete depenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can delete depenses" ON public.depenses FOR DELETE USING (true);


--
-- Name: locataires Public can delete locataires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can delete locataires" ON public.locataires FOR DELETE USING (true);


--
-- Name: paiements Public can delete paiements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can delete paiements" ON public.paiements FOR DELETE USING (true);


--
-- Name: proprietaires Public can delete proprietaires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can delete proprietaires" ON public.proprietaires FOR DELETE USING (true);


--
-- Name: biens Public can insert biens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert biens" ON public.biens FOR INSERT WITH CHECK (true);


--
-- Name: contrats Public can insert contrats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert contrats" ON public.contrats FOR INSERT WITH CHECK (true);


--
-- Name: depenses Public can insert depenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert depenses" ON public.depenses FOR INSERT WITH CHECK (true);


--
-- Name: locataires Public can insert locataires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert locataires" ON public.locataires FOR INSERT WITH CHECK (true);


--
-- Name: paiements Public can insert paiements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert paiements" ON public.paiements FOR INSERT WITH CHECK (true);


--
-- Name: proprietaires Public can insert proprietaires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert proprietaires" ON public.proprietaires FOR INSERT WITH CHECK (true);


--
-- Name: biens Public can update biens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can update biens" ON public.biens FOR UPDATE USING (true);


--
-- Name: contrats Public can update contrats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can update contrats" ON public.contrats FOR UPDATE USING (true);


--
-- Name: depenses Public can update depenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can update depenses" ON public.depenses FOR UPDATE USING (true);


--
-- Name: locataires Public can update locataires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can update locataires" ON public.locataires FOR UPDATE USING (true);


--
-- Name: paiements Public can update paiements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can update paiements" ON public.paiements FOR UPDATE USING (true);


--
-- Name: proprietaires Public can update proprietaires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can update proprietaires" ON public.proprietaires FOR UPDATE USING (true);


--
-- Name: biens Public can view biens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view biens" ON public.biens FOR SELECT USING (true);


--
-- Name: contrats Public can view contrats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view contrats" ON public.contrats FOR SELECT USING (true);


--
-- Name: depenses Public can view depenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view depenses" ON public.depenses FOR SELECT USING (true);


--
-- Name: locataires Public can view locataires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view locataires" ON public.locataires FOR SELECT USING (true);


--
-- Name: paiements Public can view paiements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view paiements" ON public.paiements FOR SELECT USING (true);


--
-- Name: proprietaires Public can view proprietaires; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view proprietaires" ON public.proprietaires FOR SELECT USING (true);


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: biens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.biens ENABLE ROW LEVEL SECURITY;

--
-- Name: contrats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contrats ENABLE ROW LEVEL SECURITY;

--
-- Name: depenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;

--
-- Name: locataires; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.locataires ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: paiements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

--
-- Name: proprietaires; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proprietaires ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


